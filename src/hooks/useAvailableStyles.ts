// src/hooks/useAvailableStyles.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface StyleOption {
    value: string;
    label: string;
    description: string;
}

// Labels e descrições para exibição
const STYLE_CONFIG: Record<string, { label: string; description: string }> = {
    lofi: {
        label: 'Lo-fi Simples',
        description: 'Edição minimalista com cortes básicos e transições suaves'
    },
    dynamic: {
        label: 'Dinâmico',
        description: 'Cortes rápidos, zooms, efeitos visuais e trilha animada'
    },
    pro: {
        label: 'PRO',
        description: 'Edição premium com color grading, VFX e motion graphics'
    },
    motion: {
        label: 'Motion Design',
        description: 'Animações 2D/3D, infográficos animados e elementos customizados'
    }
};

// Ordem de exibição dos estilos
const STYLE_ORDER = ['lofi', 'dynamic', 'pro', 'motion'];

interface UseAvailableStylesReturn {
    styles: StyleOption[];
    loading: boolean;
    error: string | null;
}

export function useAvailableStyles(video_type: string | null): UseAvailableStylesReturn {
    const [styles, setStyles] = useState<StyleOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset se tipo não selecionado
        if (!video_type) {
            setStyles([]);
            setError(null);
            return;
        }

        async function fetchStyles() {
            setLoading(true);
            setError(null);

            try {
                // Buscar estilos únicos para o tipo de vídeo
                const { data, error: fetchError } = await supabase
                    .from('pricing_config')
                    .select('editing_style')
                    .eq('video_type', video_type)
                    .eq('is_active', true);

                if (fetchError) throw fetchError;

                if (!data || data.length === 0) {
                    setStyles([]);
                    setError('Nenhum estilo disponível para este tipo de vídeo.');
                    return;
                }

                // Extrair estilos únicos e ordenar
                const uniqueStyles = [...new Set(data.map((d: any) => d.editing_style as string))];

                const sortedStyles = uniqueStyles
                    .sort((a, b) => STYLE_ORDER.indexOf(a) - STYLE_ORDER.indexOf(b))
                    .map((style: string) => ({
                        value: style,
                        label: STYLE_CONFIG[style]?.label || style,
                        description: STYLE_CONFIG[style]?.description || ''
                    }));

                setStyles(sortedStyles);
                setError(null);

            } catch (err: any) {
                console.error('Error fetching styles:', err);
                setError('Erro ao carregar estilos.');
                setStyles([]);
            } finally {
                setLoading(false);
            }
        }

        fetchStyles();
    }, [video_type]);

    return { styles, loading, error };
}
