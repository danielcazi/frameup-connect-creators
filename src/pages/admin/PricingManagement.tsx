// src/pages/admin/PricingManagement.tsx
import { useState, useEffect } from 'react';
// import DashboardLayout from '@/components/layout/DashboardLayout'; // Removed to avoid nested layouts
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { invalidatePricingCache } from '@/services/pricingService';
import {
    Save,
    RotateCcw,
    TrendingUp,
    DollarSign,
    Clock,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface PricingItem {
    id: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    platform_fee_percent: number;
    estimated_delivery_days: number;
    is_active: boolean;
}

// ============================================
// CONSTANTES DE CONFIGURAÇÃO
// ============================================

const VIDEO_TYPE_LABELS: Record<string, string> = {
    reels: '📱 Reels/Shorts',
    youtube: '📹 YouTube',
    motion: '🎨 Motion Design'
};

const EDITING_STYLE_LABELS: Record<string, string> = {
    lofi: 'Lo-fi Simples',
    dynamic: 'Dinâmico',
    pro: 'PRO',
    motion: 'Motion Design'
};

// Ordem correta de exibição dos estilos
const EDITING_STYLE_ORDER = ['lofi', 'dynamic', 'pro', 'motion'];

// Durações permitidas por tipo de vídeo e estilo
const DURATION_OPTIONS: Record<string, Record<string, string[]>> = {
    reels: {
        lofi: ['30s', '1m', '1m30s', '2m'],
        dynamic: ['30s', '1m', '1m30s', '2m'],
        pro: ['30s', '1m', '1m30s', '2m'],
        motion: [] // Motion não aparece em reels
    },
    youtube: {
        lofi: ['8m', '12m', '15m', '25m'],
        dynamic: ['8m', '12m', '15m', '25m'],
        pro: ['8m', '12m', '15m', '25m'],
        motion: ['8m', '12m', '15m', '25m']
    },
    motion: {
        lofi: [], // Lo-fi não aparece em motion
        dynamic: [], // Dinâmico não aparece em motion
        pro: ['1m', '2m', '3m', '5m'],
        motion: ['1m', '2m', '3m', '5m']
    }
};

const DURATION_LABELS: Record<string, string> = {
    '30s': '30 segundos',
    '1m': '1 minuto',
    '1m30s': '1 min 30s',
    '2m': '2 minutos',
    '3m': '3 minutos',
    '5m': '5 minutos',
    '8m': '8 minutos',
    '12m': '12 minutos',
    '15m': '15 minutos',
    '25m': '25 minutos'
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PricingManagement() {
    const { toast } = useToast();

    // Estados
    const [prices, setPrices] = useState<PricingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedType, setSelectedType] = useState<string>('reels');
    const [changedItems, setChangedItems] = useState<Set<string>>(new Set());
    const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
    const [newItems, setNewItems] = useState<PricingItem[]>([]);

    // Carregar dados ao montar
    useEffect(() => {
        fetchPrices();
    }, []);

    // ============================================
    // FUNÇÕES DE DATA FETCHING
    // ============================================

    async function fetchPrices() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pricing_config')
                .select('*')
                .eq('is_active', true)
                .order('video_type')
                .order('editing_style')
                .order('duration_category');

            if (error) throw error;

            setPrices(data || []);
            setChangedItems(new Set());
            setDeletedItems(new Set());
            setNewItems([]);
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar preços',
                description: 'Tente novamente.'
            });
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // FUNÇÕES DE MANIPULAÇÃO
    // ============================================

    function updatePrice(id: string, field: string, value: string) {
        const numValue = parseFloat(value) || 0;

        // Atualizar em prices
        setPrices(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: numValue } : item
            )
        );

        // Atualizar em newItems se for novo
        setNewItems(prev =>
            prev.map(item =>
                item.id === id ? { ...item, [field]: numValue } : item
            )
        );

        setChangedItems(prev => new Set(prev).add(id));
    }

    function addNewPricing(style: string, duration: string) {
        const tempId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newItem: PricingItem = {
            id: tempId,
            video_type: selectedType,
            editing_style: style,
            duration_category: duration,
            base_price: 100,
            platform_fee_percent: 15,
            estimated_delivery_days: 5,
            is_active: true
        };

        setNewItems(prev => [...prev, newItem]);
        setPrices(prev => [...prev, newItem]);
        setChangedItems(prev => new Set(prev).add(tempId));

        toast({
            title: '➕ Preço adicionado',
            description: `${DURATION_LABELS[duration]} - Configure os valores e salve.`
        });
    }

    function markForDeletion(id: string) {
        setDeletedItems(prev => new Set(prev).add(id));

        toast({
            title: '🗑️ Marcado para exclusão',
            description: 'Clique em "Salvar" para confirmar ou "Descartar" para cancelar.'
        });
    }

    function undoDelete(id: string) {
        setDeletedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
    }

    // ============================================
    // FUNÇÃO DE SALVAR
    // ============================================

    async function saveChanges() {
        if (changedItems.size === 0 && deletedItems.size === 0) {
            toast({
                title: 'Nenhuma alteração',
                description: 'Não há mudanças para salvar.'
            });
            return;
        }

        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            let deletedCount = 0;
            let insertedCount = 0;
            let updatedCount = 0;

            // 1. DELETAR itens marcados
            for (const itemId of Array.from(deletedItems)) {
                if (!itemId.startsWith('new_')) {
                    const { error } = await supabase
                        .from('pricing_config')
                        .delete()
                        .eq('id', itemId);

                    if (error) throw error;
                    deletedCount++;
                }
            }

            // 2. INSERIR novos itens (que não foram deletados)
            const itemsToInsert = newItems.filter(item => !deletedItems.has(item.id));

            for (const item of itemsToInsert) {
                const { error } = await supabase
                    .from('pricing_config')
                    .insert({
                        video_type: item.video_type,
                        editing_style: item.editing_style,
                        duration_category: item.duration_category,
                        base_price: item.base_price,
                        platform_fee_percent: item.platform_fee_percent,
                        estimated_delivery_days: item.estimated_delivery_days,
                        is_active: true,
                        created_by: user?.id
                    });

                if (error) throw error;
                insertedCount++;
            }

            // 3. ATUALIZAR itens existentes modificados
            const existingItemsToUpdate = prices.filter(
                item => !item.id.startsWith('new_') &&
                    changedItems.has(item.id) &&
                    !deletedItems.has(item.id)
            );

            for (const item of existingItemsToUpdate) {
                const { error } = await supabase
                    .from('pricing_config')
                    .update({
                        base_price: item.base_price,
                        platform_fee_percent: item.platform_fee_percent,
                        estimated_delivery_days: item.estimated_delivery_days,
                        updated_at: new Date().toISOString(),
                        created_by: user?.id
                    })
                    .eq('id', item.id);

                if (error) throw error;
                updatedCount++;
            }

            // Invalidar cache do serviço de preços
            invalidatePricingCache();

            // Feedback de sucesso
            const messages = [];
            if (insertedCount > 0) messages.push(`${insertedCount} criado(s)`);
            if (updatedCount > 0) messages.push(`${updatedCount} atualizado(s)`);
            if (deletedCount > 0) messages.push(`${deletedCount} excluído(s)`);

            toast({
                title: '✅ Alterações salvas!',
                description: messages.join(', ') || 'Operação concluída.'
            });

            // Recarregar dados frescos
            await fetchPrices();

        } catch (error: any) {
            console.error('Erro ao salvar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: error.message || 'Algumas alterações podem não ter sido salvas.'
            });
        } finally {
            setSaving(false);
        }
    }

    function resetChanges() {
        fetchPrices();
        toast({
            title: 'Alterações descartadas',
            description: 'Os valores foram restaurados.'
        });
    }

    // ============================================
    // PREPARAÇÃO DOS DADOS PARA EXIBIÇÃO
    // ============================================

    // Filtrar preços pelo tipo selecionado (excluindo deletados)
    const filteredPrices = prices.filter(p =>
        p.video_type === selectedType && !deletedItems.has(p.id)
    );

    // Filtrar estilos disponíveis para o tipo selecionado
    const orderedStyles = EDITING_STYLE_ORDER.filter(style =>
        DURATION_OPTIONS[selectedType]?.[style]?.length > 0
    );

    // Agrupar preços por estilo
    const groupedByStyle: Record<string, PricingItem[]> = {};
    orderedStyles.forEach(style => {
        const styleItems = filteredPrices.filter(p => p.editing_style === style);
        const durationOrder = DURATION_OPTIONS[selectedType][style];

        groupedByStyle[style] = styleItems.sort((a, b) => {
            return durationOrder.indexOf(a.duration_category) - durationOrder.indexOf(b.duration_category);
        });
    });

    // Contadores para header
    const totalChanges = changedItems.size;
    const totalDeletions = deletedItems.size;
    const hasChanges = totalChanges > 0 || totalDeletions > 0;

    // ============================================
    // RENDER
    // ============================================

    return (
        // DashboardLayout removed to prevent nested layouts inside AdminLayout
        // <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-blue-500" />
                        Gerenciamento de Preços
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Configure os preços dos serviços da plataforma
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <>
                            <span className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-full">
                                {totalChanges} alteração(ões) • {totalDeletions} exclusão(ões)
                            </span>
                            <Button
                                variant="outline"
                                onClick={resetChanges}
                                disabled={saving}
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Descartar
                            </Button>
                            <Button
                                onClick={saveChanges}
                                disabled={saving}
                                className="bg-green-500 hover:bg-green-600"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Filtros por Tipo de Vídeo */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-6">
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(VIDEO_TYPE_LABELS).map(([type, label]) => {
                        const count = prices.filter(p => p.video_type === type && !deletedItems.has(p.id)).length;

                        return (
                            <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${selectedType === type
                                        ? 'bg-blue-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {label}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedType === type
                                        ? 'bg-blue-400 text-white'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-gray-500 mt-4">Carregando preços...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {orderedStyles.map((style) => {
                        const items = groupedByStyle[style] || [];
                        const availableDurations = DURATION_OPTIONS[selectedType][style];
                        const existingDurations = items.map(i => i.duration_category);
                        const missingDurations = availableDurations.filter(d => !existingDurations.includes(d));

                        return (
                            <div key={style} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Header do Estilo */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b-2 border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {EDITING_STYLE_LABELS[style]}
                                        </h2>
                                        <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
                                            {items.length} preço(s)
                                        </span>
                                    </div>

                                    {/* Botões para Adicionar Durações Faltantes */}
                                    {missingDurations.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm text-gray-600">Adicionar:</span>
                                            {missingDurations.map(duration => (
                                                <button
                                                    key={duration}
                                                    onClick={() => addNewPricing(style, duration)}
                                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    {DURATION_LABELS[duration]}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tabela de Preços */}
                                {items.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Duração
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <DollarSign className="w-4 h-4 inline mr-1" />
                                                        Preço Base (R$)
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <TrendingUp className="w-4 h-4 inline mr-1" />
                                                        Taxa (%)
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        <Clock className="w-4 h-4 inline mr-1" />
                                                        Prazo (dias)
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Total Cliente
                                                    </th>
                                                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                        Ações
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {items.map((item) => {
                                                    const isChanged = changedItems.has(item.id);
                                                    const isNew = item.id.startsWith('new_');
                                                    const platformFee = item.base_price * (item.platform_fee_percent / 100);
                                                    const totalPrice = item.base_price + platformFee;

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            className={`transition-colors ${isNew
                                                                    ? 'bg-green-50 hover:bg-green-100'
                                                                    : isChanged
                                                                        ? 'bg-amber-50 hover:bg-amber-100'
                                                                        : 'hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {/* Duração */}
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-gray-900">
                                                                        {DURATION_LABELS[item.duration_category]}
                                                                    </span>
                                                                    {isNew && (
                                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                                            Novo
                                                                        </span>
                                                                    )}
                                                                    {isChanged && !isNew && (
                                                                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                                                            Editado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Preço Base */}
                                                            <td className="px-6 py-4">
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                                        R$
                                                                    </span>
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        value={item.base_price}
                                                                        onChange={(e) => updatePrice(item.id, 'base_price', e.target.value)}
                                                                        className={`w-32 pl-10 pr-3 py-2 border-2 rounded-lg font-semibold transition-colors ${isChanged
                                                                                ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
                                                                                : 'border-gray-300 focus:border-blue-500'
                                                                            }`}
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Taxa da Plataforma */}
                                                            <td className="px-6 py-4">
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.1"
                                                                        min="0"
                                                                        max="100"
                                                                        value={item.platform_fee_percent}
                                                                        onChange={(e) => updatePrice(item.id, 'platform_fee_percent', e.target.value)}
                                                                        className={`w-24 px-3 py-2 border-2 rounded-lg font-semibold transition-colors ${isChanged
                                                                                ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
                                                                                : 'border-gray-300 focus:border-blue-500'
                                                                            }`}
                                                                    />
                                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                                                        %
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            {/* Prazo de Entrega */}
                                                            <td className="px-6 py-4">
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.estimated_delivery_days}
                                                                        onChange={(e) => updatePrice(item.id, 'estimated_delivery_days', e.target.value)}
                                                                        className={`w-20 px-3 py-2 border-2 rounded-lg font-semibold transition-colors ${isChanged
                                                                                ? 'border-amber-400 bg-amber-50 focus:border-amber-500'
                                                                                : 'border-gray-300 focus:border-blue-500'
                                                                            }`}
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Total Calculado */}
                                                            <td className="px-6 py-4">
                                                                <div className="text-sm">
                                                                    <div className="font-bold text-green-600 text-lg">
                                                                        R$ {totalPrice.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        (Taxa: R$ {platformFee.toFixed(2)})
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Ações */}
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => markForDeletion(item.id)}
                                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Excluir preço"
                                                                >
                                                                    <Trash2 className="w-5 h-5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500">
                                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="font-medium">Nenhum preço configurado para este estilo.</p>
                                        {missingDurations.length > 0 && (
                                            <p className="text-sm mt-2">
                                                Use os botões acima para adicionar durações.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Alerta de Exclusões Pendentes */}
            {deletedItems.size > 0 && (
                <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-red-900 mb-2">
                                ⚠️ {deletedItems.size} item(ns) marcado(s) para exclusão
                            </h3>
                            <p className="text-sm text-red-700 mb-3">
                                Estes preços serão permanentemente removidos ao clicar em "Salvar Alterações".
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletedItems(new Set())}
                                className="border-red-300 text-red-700 hover:bg-red-100"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Desfazer Todas Exclusões
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card de Informações */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    💡 Guia Rápido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div className="space-y-2">
                        <p className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span><strong>Preço Base:</strong> Valor que o editor recebe</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold">•</span>
                            <span><strong>Taxa:</strong> Percentual da plataforma sobre o preço</span>
                        </p>
                    </div>
                    <div className="space-y-2">
                        <p className="flex items-start gap-2">
                            <span className="text-green-500 font-bold">•</span>
                            <span><strong>Total Cliente:</strong> Preço Base + Taxa = Valor final</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold">•</span>
                            <span><strong>Prazo:</strong> Multiplicado pela quantidade em lotes</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        // </DashboardLayout>
    );
}
