import { useState, useEffect } from 'react';
import { calculateFullPrice, FEATURES_BY_STYLE } from '@/services/pricingService';

export interface PricingData {
    pricing_id: string;
    base_price: number;
    platform_fee: number;
    total_paid_by_creator: number;
    editor_receives: number;
    estimated_delivery_days: number;
    features: string[];
    platform_fee_percent: number; // New field
    loading: boolean;
    error: string | null;
}

export function useProjectPricing(
    video_type: string | null,
    editing_style: string | null,
    duration_category: string | null
): PricingData {
    const [pricing, setPricing] = useState<PricingData>({
        pricing_id: '',
        base_price: 0,
        platform_fee: 0,
        total_paid_by_creator: 0,
        editor_receives: 0,
        estimated_delivery_days: 0,
        features: [],
        platform_fee_percent: 0, // Initial value
        loading: false,
        error: null
    });

    useEffect(() => {
        if (!video_type || !editing_style || !duration_category) {
            setPricing({
                pricing_id: '',
                base_price: 0,
                platform_fee: 0,
                total_paid_by_creator: 0,
                editor_receives: 0,
                estimated_delivery_days: 0,
                features: [],
                platform_fee_percent: 0,
                loading: false,
                error: null
            });
            return;
        }

        let isMounted = true;

        async function fetchPricing() {
            setPricing(prev => ({ ...prev, loading: true, error: null }));

            try {
                // Calcular preço completo usando o serviço centralizado
                // Por padrão assumimos quantidade 1 e entrega sequencial (ajustado depois no componente de lote se necessário)
                const calculation = await calculateFullPrice(
                    video_type!,
                    editing_style!,
                    duration_category!
                );

                if (isMounted) {
                    setPricing({
                        pricing_id: calculation.pricing_id,
                        base_price: calculation.base_price,
                        platform_fee: calculation.platform_fee,
                        total_paid_by_creator: calculation.subtotal + calculation.platform_fee, // Ensure consistent total
                        editor_receives: calculation.editor_earnings_per_video,
                        estimated_delivery_days: calculation.estimated_delivery_days,
                        features: FEATURES_BY_STYLE[editing_style!] || [],
                        platform_fee_percent: calculation.platform_fee_percent, // Populate from service
                        loading: false,
                        error: null
                    });
                }
            } catch (err) {
                console.error('Error fetching pricing:', err);
                if (isMounted) {
                    setPricing(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Combinação de preço não encontrada ou erro de conexão.'
                    }));
                }
            }
        }

        fetchPricing();

        return () => {
            isMounted = false;
        };
    }, [video_type, editing_style, duration_category]);

    return pricing;
}
