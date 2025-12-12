// src/pages/admin/PlatformSettings.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    invalidatePricingCache,
} from '@/services/pricingService';
import { supabase } from '@/lib/supabase';
import {
    Save,
    Settings,
    TrendingUp,
    Package,
    AlertCircle,
    RefreshCw
} from 'lucide-react';

export default function PlatformSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            setLoading(true);
            setError(null);

            // Invalidar cache para garantir dados frescos
            invalidatePricingCache();

            // Buscar direto do banco (não usar cache)
            const { data, error: fetchError } = await supabase
                .from('platform_settings')
                .select('*');

            if (fetchError) throw fetchError;

            const settingsObj: Record<string, any> = {};
            data?.forEach(item => {
                settingsObj[item.setting_key] = item.setting_value;
            });

            setSettings(settingsObj);
            setHasChanges(false);
        } catch (err) {
            console.error('Erro ao buscar configurações:', err);
            setError('Erro ao carregar configurações. Tente novamente.');
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar',
                description: 'Tente novamente.'
            });
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings() {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            for (const [key, value] of Object.entries(settings)) {
                const { error: updateError } = await supabase
                    .from('platform_settings')
                    .update({
                        setting_value: value,
                        updated_at: new Date().toISOString(),
                        updated_by: user?.id
                    })
                    .eq('setting_key', key);

                if (updateError) throw updateError;
            }

            // Invalidar cache global
            invalidatePricingCache();

            toast({
                title: '✅ Configurações salvas!',
                description: 'As alterações foram aplicadas.'
            });

            setHasChanges(false);
            fetchSettings();
        } catch (err) {
            console.error('Erro ao salvar:', err);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: 'Tente novamente.'
            });
        } finally {
            setSaving(false);
        }
    }

    function updateBatchDiscount(qty: string, discount: string) {
        const numDiscount = parseFloat(discount) || 0;
        setSettings(prev => ({
            ...prev,
            batch_discounts: {
                ...prev.batch_discounts,
                [qty]: numDiscount
            }
        }));
        setHasChanges(true);
    }

    function updateSetting(key: string, value: string) {
        const numValue = parseFloat(value) || 0;
        setSettings(prev => ({
            ...prev,
            [key]: numValue
        }));
        setHasChanges(true);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
                    <p className="text-gray-500 mt-4">Carregando configurações...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-blue-500" />
                        Configurações da Plataforma
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gerencie descontos, taxas e limites globais
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={fetchSettings}
                        disabled={saving}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Recarregar
                    </Button>
                    <Button
                        onClick={saveSettings}
                        disabled={saving || !hasChanges}
                        className="bg-green-500 hover:bg-green-600"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            {/* Erro */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                    <Button variant="outline" size="sm" onClick={fetchSettings}>
                        Tentar novamente
                    </Button>
                </div>
            )}

            {/* Indicador de alterações */}
            {hasChanges && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    <span className="text-amber-700 font-medium">
                        Você tem alterações não salvas
                    </span>
                </div>
            )}

            <div className="space-y-6">
                {/* Descontos Progressivos */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-500" />
                        Descontos Progressivos em Lote
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(settings.batch_discounts || {}).map(([qty, discount]) => (
                            <div key={qty} className="bg-gray-50 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {qty}+ vídeos
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        value={discount as number}
                                        onChange={(e) => updateBatchDiscount(qty, e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 font-semibold pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                                        %
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-sm text-gray-500 mt-4">
                        💡 Exemplo: Se configurar "4: 5%", clientes que comprarem 4 ou mais vídeos ganham 5% de desconto
                    </p>
                </div>

                {/* Taxas e Multiplicadores */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Taxas e Multiplicadores
                    </h2>

                    <div className="space-y-4">
                        {/* Taxa da Plataforma */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Taxa da Plataforma Global (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={settings.platform_fee_percent || 15}
                                onChange={(e) => updateSetting('platform_fee_percent', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Pode ser sobrescrita individualmente em cada combinação de preço
                            </p>
                        </div>

                        {/* Multiplicador de Urgência */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Multiplicador de Entrega Simultânea
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                max="3"
                                value={settings.simultaneous_delivery_multiplier || 1.2}
                                onChange={(e) => updateSetting('simultaneous_delivery_multiplier', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                1.2 = +20% no preço para entrega simultânea
                            </p>
                        </div>
                    </div>
                </div>

                {/* Revisões */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        📝 Revisões
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Revisões Gratuitas
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={settings.free_revisions_limit || 2}
                                onChange={(e) => updateSetting('free_revisions_limit', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Custo Revisões Extras (%)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={settings.extra_revision_cost_percent || 20}
                                onChange={(e) => updateSetting('extra_revision_cost_percent', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Percentual do valor do vídeo cobrado por revisão extra
                            </p>
                        </div>
                    </div>
                </div>

                {/* Limites de Lote */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        📦 Limites de Lote
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantidade Mínima
                            </label>
                            <input
                                type="number"
                                min="2"
                                value={settings.min_batch_quantity || 4}
                                onChange={(e) => updateSetting('min_batch_quantity', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Quantidade Máxima
                            </label>
                            <input
                                type="number"
                                max="100"
                                value={settings.max_batch_quantity || 20}
                                onChange={(e) => updateSetting('max_batch_quantity', e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
