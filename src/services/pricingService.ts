// src/services/pricingService.ts
import { supabase } from '@/lib/supabase';

// ============================================
// INTERFACES
// ============================================

export interface PricingConfig {
    id: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    platform_fee_percent: number;
    estimated_delivery_days: number;
    is_active: boolean;
}

export interface PlatformSettings {
    batch_discounts: { [key: string]: number };
    platform_fee_percent: number;
    simultaneous_delivery_multiplier: number;
    free_revisions_limit: number;
    extra_revision_cost_percent: number;
    min_batch_quantity: number;
    max_batch_quantity: number;
}

export interface PriceCalculation {
    pricing_id: string;
    base_price: number;
    quantity: number;
    discount_percent: number;
    price_per_video: number;
    subtotal: number;
    platform_fee_percent: number;
    platform_fee: number;
    total_paid_by_creator: number;
    editor_earnings_per_video: number;
    estimated_delivery_days: number;
    delivery_mode: 'sequential' | 'simultaneous';
    urgency_multiplier: number;
}

// ============================================
// CONSTANTS
// ============================================

export const FEATURES_BY_STYLE: Record<string, string[]> = {
    lofi: ['Cortes básicos', 'Legendas simples', 'Trilha sonora'],
    dynamic: ['Cortes dinâmicos', 'Animações de texto', 'Sincronização musical'],
    pro: ['B-roll profissional', 'Textos dinâmicos', 'Color grading'],
    motion: ['Motion graphics', 'Animações 2D', 'Telas personalizadas']
};

// ============================================
// CACHE
// ============================================

let cachedSettings: PlatformSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

// ============================================
// FUNÇÕES PÚBLICAS
// ============================================

/**
 * Busca preço específico por combinação
 */
export async function getPrice(
    videoType: string,
    editingStyle: string,
    durationCategory: string
): Promise<PricingConfig> {
    try {
        const { data, error } = await supabase
            .from('pricing_config')
            .select('*')
            .eq('video_type', videoType)
            .eq('editing_style', editingStyle)
            .eq('duration_category', durationCategory)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error('Erro ao buscar preço:', error);
            throw new Error(`Preço não encontrado para ${videoType}/${editingStyle}/${durationCategory}`);
        }

        return data as PricingConfig;
    } catch (error) {
        console.error('Erro ao buscar preço:', error);
        throw error;
    }
}

/**
 * Busca durações disponíveis para uma combinação de tipo e estilo
 */
export async function getAvailableDurations(
    videoType: string,
    editingStyle: string
): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('pricing_config')
            .select('duration_category')
            .eq('video_type', videoType)
            .eq('editing_style', editingStyle)
            .eq('is_active', true)
            .order('base_price', { ascending: true }); // Ordenar por preço geralmente ordena por duração (hack simples)

        if (error) throw error;

        // Extrair e desduplicar durações
        return Array.from(new Set(data?.map(item => item.duration_category) || []));
    } catch (error) {
        console.error('Erro ao buscar durações:', error);
        return [];
    }
}

/**
 * Busca todas as configurações da plataforma (com cache)
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
    const now = Date.now();

    // Retorna cache se válido
    if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION_MS) {
        return cachedSettings;
    }

    try {
        const { data, error } = await supabase
            .from('platform_settings')
            .select('setting_key, setting_value');

        if (error) throw error;

        const settings: Record<string, any> = {};
        data?.forEach(item => {
            settings[item.setting_key] = item.setting_value;
        });

        cachedSettings = settings as PlatformSettings;
        cacheTimestamp = now;

        return cachedSettings;
    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        throw error;
    }
}

/**
 * Calcula preço completo com descontos, taxas e prazos
 */
export async function calculateFullPrice(
    videoType: string,
    editingStyle: string,
    durationCategory: string,
    quantity: number = 1,
    deliveryMode: 'sequential' | 'simultaneous' = 'sequential'
): Promise<PriceCalculation> {
    try {
        // Buscar preço base
        const pricing = await getPrice(videoType, editingStyle, durationCategory);

        // Buscar configurações
        const settings = await getPlatformSettings();

        // Calcular desconto progressivo
        let discountPercent = 0;
        if (quantity >= settings.min_batch_quantity) {
            const discountTiers = settings.batch_discounts;
            const applicableTiers = Object.entries(discountTiers)
                .map(([qty, discount]) => ({ qty: parseInt(qty), discount: discount as number }))
                .filter(tier => quantity >= tier.qty)
                .sort((a, b) => b.qty - a.qty);

            if (applicableTiers.length > 0) {
                discountPercent = applicableTiers[0].discount;
            }
        }

        // Calcular multiplicador de urgência
        const urgencyMultiplier = deliveryMode === 'simultaneous'
            ? settings.simultaneous_delivery_multiplier
            : 1;

        // Preço por vídeo (com desconto e urgência)
        const pricePerVideo = pricing.base_price * (1 - discountPercent / 100) * urgencyMultiplier;

        // Subtotal (editor recebe)
        const subtotal = pricePerVideo * quantity;

        // Taxa da plataforma (usa individual ou global)
        const platformFeePercent = pricing.platform_fee_percent || settings.platform_fee_percent;
        const platformFee = subtotal * (platformFeePercent / 100);

        // Total que o cliente paga
        const totalPaidByCreator = subtotal + platformFee;

        // Editor recebe por vídeo (sem taxa)
        const editorEarningsPerVideo = pricePerVideo * (1 - platformFeePercent / 100);

        // Prazo de entrega
        const baseDeadlineDays = pricing.estimated_delivery_days;
        const totalDeadlineDays = deliveryMode === 'sequential'
            ? baseDeadlineDays * quantity
            : Math.ceil(baseDeadlineDays * 1.5);

        return {
            pricing_id: pricing.id,
            base_price: pricing.base_price,
            quantity,
            discount_percent: discountPercent,
            price_per_video: pricePerVideo,
            subtotal,
            platform_fee_percent: platformFeePercent,
            platform_fee: platformFee,
            total_paid_by_creator: totalPaidByCreator,
            editor_earnings_per_video: editorEarningsPerVideo,
            estimated_delivery_days: totalDeadlineDays,
            delivery_mode: deliveryMode,
            urgency_multiplier: urgencyMultiplier
        };
    } catch (error) {
        console.error('Erro ao calcular preço:', error);
        throw error;
    }
}

/**
 * Busca todos os preços ativos (para admin)
 */
export async function getAllPrices(): Promise<PricingConfig[]> {
    try {
        const { data, error } = await supabase
            .from('pricing_config')
            .select('*')
            .eq('is_active', true)
            .order('video_type')
            .order('editing_style')
            .order('duration_category');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar todos os preços:', error);
        throw error;
    }
}

/**
 * Atualiza um preço específico (admin)
 */
export async function updatePrice(
    id: string,
    updates: Partial<Pick<PricingConfig, 'base_price' | 'platform_fee_percent' | 'estimated_delivery_days'>>
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('pricing_config')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
                created_by: user?.id
            })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Erro ao atualizar preço:', error);
        throw error;
    }
}

/**
 * Atualiza configuração da plataforma (admin)
 */
export async function updatePlatformSetting(
    key: string,
    value: any
): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('platform_settings')
            .update({
                setting_value: value,
                updated_at: new Date().toISOString(),
                updated_by: user?.id
            })
            .eq('setting_key', key);

        if (error) throw error;

        // Invalidar cache
        invalidatePricingCache();
    } catch (error) {
        console.error('Erro ao atualizar configuração:', error);
        throw error;
    }
}

/**
 * Invalidar cache (chamado após atualizações)
 */
export function invalidatePricingCache(): void {
    cachedSettings = null;
    cacheTimestamp = 0;
}

/**
 * Busca histórico de alterações de preço (admin)
 */
export async function getPricingHistory(limit: number = 50): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('pricing_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        throw error;
    }
}

export async function createPrice(data: Partial<PricingConfig>): Promise<PricingConfig> {
    const { data: newPrice, error } = await supabase
        .from('pricing_config')
        .insert([data])
        .select()
        .single();

    if (error) throw error;

    // Invalidar cache
    invalidatePricingCache(); // Changed from settingsCache.lastFetched = 0; to invalidatePricingCache() for consistency

    return newPrice;
}

export async function deletePrice(id: string): Promise<void> {
    const { error } = await supabase
        .from('pricing_config')
        .delete()
        .eq('id', id);

    if (error) throw error;

    // Invalidar cache
    invalidatePricingCache(); // Changed from settingsCache.lastFetched = 0; to invalidatePricingCache() for consistency
}
