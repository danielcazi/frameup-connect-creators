import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface PricingData {
    pricing_id: string;
    base_price: number;
    platform_fee: number;
    total_paid_by_creator: number;
    editor_receives: number;
    estimated_delivery_days: number;
    features: string[];
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
        loading: false,
        error: null
    });

    useEffect(() => {
        if (!video_type || !editing_style || !duration_category) {
            // Reset pricing if any field is missing
            setPricing({
                pricing_id: '',
                base_price: 0,
                platform_fee: 0,
                total_paid_by_creator: 0,
                editor_receives: 0,
                estimated_delivery_days: 0,
                features: [],
                loading: false,
                error: null
            });
            return;
        }

        async function fetchPricing() {
            setPricing(prev => ({ ...prev, loading: true, error: null }));

            try {
                const { data, error } = await supabase
                    .from('pricing_table')
                    .select('*')
                    .eq('video_type', video_type)
                    .eq('editing_style', editing_style)
                    .eq('duration_category', duration_category)
                    .eq('is_active', true)
                    .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

                if (error) throw error;

                if (!data) {
                    setPricing(prev => ({
                        ...prev,
                        loading: false,
                        error: 'Combinação de preço não encontrada. Entre em contato.'
                    }));
                    return;
                }

                // Calcular valores
                const basePrice = Number(data.base_price);
                const platformFee = basePrice * 0.05; // 5%
                const totalPrice = basePrice + platformFee;

                setPricing({
                    pricing_id: data.id,
                    base_price: basePrice,
                    platform_fee: platformFee,
                    total_paid_by_creator: totalPrice,
                    editor_receives: basePrice,
                    estimated_delivery_days: data.estimated_delivery_days,
                    features: data.features || [],
                    loading: false,
                    error: null
                });
            } catch (err) {
                console.error('Error fetching pricing:', err);
                setPricing(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Erro ao calcular preço. Tente novamente.'
                }));
            }
        }

        fetchPricing();
    }, [video_type, editing_style, duration_category]);

    return pricing;
}
