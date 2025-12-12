export * from './database';
export * from './approval';
export * from './delivery';

// =====================================================
// TIPOS PARA PROJETOS EM LOTE (BATCH)
// =====================================================

// Status possíveis de um vídeo do lote
export type BatchVideoStatus = 'pending' | 'in_progress' | 'delivered' | 'revision' | 'approved';

// Modo de entrega do lote
export type BatchDeliveryMode = 'sequential' | 'simultaneous';

// Duração do material bruto
export type RawFootageDuration = '0-30min' | '30min-1h' | '1-3h' | '3h+';

// Interface para um vídeo individual do lote
export interface BatchVideo {
    id?: string;
    project_id: string;
    sequence_order: number;
    title: string;
    specific_instructions?: string;
    editor_can_choose_timing: boolean;
    selected_timestamp_start?: number; // Em segundos
    selected_timestamp_end?: number;   // Em segundos
    status: BatchVideoStatus;
    delivery_id?: string;
    approved_at?: string;
    payment_released_at?: string;
    payment_amount?: number;
    revision_count: number;
    paid_extra_revisions: boolean;
    created_at?: string;
    updated_at?: string;
}

// Interface para criação de vídeo do lote (sem campos automáticos)
export interface BatchVideoCreate {
    sequence_order: number;
    title: string;
    specific_instructions?: string;
    editor_can_choose_timing: boolean;
    selected_timestamp_start?: number;
    selected_timestamp_end?: number;
}

// Campos adicionais do projeto para lote
export interface ProjectBatchFields {
    is_batch: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: BatchDeliveryMode;
    batch_discount_percent?: number;
    editor_earnings_per_video?: number;
    editor_earnings_released?: number;
    videos_approved?: number;
    // Briefing aprimorado
    brand_identity_url?: string;
    fonts_url?: string;
    raw_footage_url?: string;
    raw_footage_duration?: RawFootageDuration;
    music_sfx_url?: string;
}

// Cálculo de preços do lote
export interface BatchPricing {
    basePrice: number;
    quantity: number;
    discountPercent: number;
    pricePerVideo: number;
    subtotal: number;
    urgencyFee: number;
    platformFee: number;
    total: number;
    savings: number;
    editorEarningsPerVideo: number;
    editorEarningsTotal: number;
}

// Helper para calcular preços do lote
export function calculateBatchPricing(
    basePrice: number,
    quantity: number,
    deliveryMode: BatchDeliveryMode
): BatchPricing {
    // Desconto progressivo por quantidade
    let discountPercent = 0;
    if (quantity >= 10) discountPercent = 10;
    else if (quantity >= 7) discountPercent = 8;
    else if (quantity >= 4) discountPercent = 5;

    // Multiplicador de urgência para entrega simultânea
    const urgencyMultiplier = deliveryMode === 'simultaneous' ? 1.2 : 1;

    // Cálculos
    const pricePerVideo = basePrice * (1 - discountPercent / 100) * urgencyMultiplier;
    const subtotal = pricePerVideo * quantity;
    const urgencyFee = deliveryMode === 'simultaneous' ? (basePrice * quantity * 0.2) : 0;
    const platformFee = subtotal * 0.15; // 15% taxa da plataforma
    const total = subtotal + platformFee;
    const savings = (basePrice * quantity) - (pricePerVideo * quantity);

    // Ganhos do editor (85% do subtotal)
    const editorEarningsPerVideo = pricePerVideo * 0.85;
    const editorEarningsTotal = editorEarningsPerVideo * quantity;

    return {
        basePrice,
        quantity,
        discountPercent,
        pricePerVideo,
        subtotal,
        urgencyFee,
        platformFee,
        total,
        savings,
        editorEarningsPerVideo,
        editorEarningsTotal
    };
}
