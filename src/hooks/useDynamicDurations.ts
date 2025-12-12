// src/hooks/useDynamicDurations.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DurationOption {
    value: string;
    label: string;
}

// Labels para exibição amigável
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

// Ordem de exibição das durações
const DURATION_ORDER = ['30s', '1m', '1m30s', '2m', '3m', '5m', '8m', '12m', '15m', '25m'];

interface UseDynamicDurationsReturn {
    durations: DurationOption[];
    loading: boolean;
    error: string | null;
}

export function useDynamicDurations(
    video_type: string | null,
    editing_style: string | null
): UseDynamicDurationsReturn {
    const [durations, setDurations] = useState<DurationOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset se tipo ou estilo não selecionado
        if (!video_type || !editing_style) {
            setDurations([]);
            setError(null);
            return;
        }

        async function fetchDurations() {
            setLoading(true);
            setError(null);

            try {
                // Buscar durações únicas para a combinação tipo + estilo
                const { data, error: fetchError } = await supabase
                    .from('pricing_config')
                    .select('duration_category')
                    .eq('video_type', video_type)
                    .eq('editing_style', editing_style)
                    .eq('is_active', true);

                if (fetchError) throw fetchError;

                if (!data || data.length === 0) {
                    setDurations([]);
                    setError('Nenhuma duração disponível para esta combinação.');
                    return;
                }

                // Extrair durações únicas e ordenar
                const uniqueDurations = [...new Set(data.map((d: any) => d.duration_category as string))];

                const sortedDurations = uniqueDurations
                    .sort((a, b) => DURATION_ORDER.indexOf(a) - DURATION_ORDER.indexOf(b))
                    .map((duration: string) => ({
                        value: duration,
                        label: DURATION_LABELS[duration] || duration
                    }));

                setDurations(sortedDurations);
                setError(null);

            } catch (err: any) {
                console.error('Error fetching durations:', err);
                setError('Erro ao carregar durações.');
                setDurations([]);
            } finally {
                setLoading(false);
            }
        }

        fetchDurations();
    }, [video_type, editing_style]);

    return { durations, loading, error };
}
