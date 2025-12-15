// src/hooks/useBatchVideosRealtime.ts
import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseBatchVideosRealtimeOptions {
    projectId: string | undefined;
    onUpdate: () => void; // Função para recarregar dados
}

export function useBatchVideosRealtime({ projectId, onUpdate }: UseBatchVideosRealtimeOptions) {
    const setupRealtimeSubscription = useCallback(() => {
        if (!projectId) return null;

        console.log('[Realtime] Configurando subscription para projeto:', projectId);

        // Inscrever em mudanças na tabela batch_videos
        const channel = supabase
            .channel(`batch-videos-${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'batch_videos',
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    console.log('[Realtime] Mudança detectada em batch_videos:', payload);
                    // Recarregar dados do projeto
                    onUpdate();
                }
            )
            // Inscrever em mudanças na tabela projects (para status geral)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'projects',
                    filter: `id=eq.${projectId}`
                },
                (payload) => {
                    console.log('[Realtime] Projeto atualizado:', payload);
                    onUpdate();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] Status da subscription:', status);
            });

        return channel;
    }, [projectId, onUpdate]);

    useEffect(() => {
        const channel = setupRealtimeSubscription();

        return () => {
            if (channel) {
                console.log('[Realtime] Removendo subscription');
                supabase.removeChannel(channel);
            }
        };
    }, [setupRealtimeSubscription]);
}

export default useBatchVideosRealtime;
