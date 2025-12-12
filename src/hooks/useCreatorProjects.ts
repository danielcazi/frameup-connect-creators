import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// =====================================================
// INTERFACES
// =====================================================
export interface BatchVideo {
    id: string;
    sequence_order: number;
    title: string;
    specific_instructions?: string;
    status: 'pending' | 'in_progress' | 'delivered' | 'revision' | 'approved';
    revision_count: number;
    approved_at: string | null;
    payment_released_at: string | null;
    payment_amount: number;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    status: string;
    base_price: number;
    created_at: string;
    deadline: string;

    // Campos de lote
    is_batch: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: 'sequential' | 'simultaneous';
    batch_discount_percent?: number;
    videos_approved?: number;
    editor_earnings_per_video?: number;
    editor_earnings_released?: number;

    // Relacionamentos
    assigned_editor_id?: string;
    editor_name?: string;
    editor_photo?: string;
    batch_videos?: BatchVideo[];
}

// =====================================================
// HOOK
// =====================================================
export function useCreatorProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Obter usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Usuário não autenticado');
                return;
            }

            // Buscar projetos do creator
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select(`
          *,
          editor:users!assigned_editor_id(
            full_name,
            profile_photo_url
          )
        `)
                .eq('creator_id', user.id)
                .order('created_at', { ascending: false });

            if (projectsError) {
                throw new Error(projectsError.message);
            }

            // Para cada projeto em lote, buscar os batch_videos
            const projectsWithBatch = await Promise.all(
                (projectsData || []).map(async (project) => {
                    let batchVideos: BatchVideo[] = [];

                    if (project.is_batch) {
                        const { data: videosData, error: videosError } = await supabase
                            .from('batch_videos')
                            .select('*')
                            .eq('project_id', project.id)
                            .order('sequence_order', { ascending: true });

                        if (!videosError && videosData) {
                            batchVideos = videosData;
                        }
                    }

                    return {
                        ...project,
                        editor_name: project.editor?.full_name || null,
                        editor_photo: project.editor?.profile_photo_url || null,
                        batch_videos: batchVideos,
                    };
                })
            );

            setProjects(projectsWithBatch);

        } catch (err: any) {
            console.error('Erro ao buscar projetos:', err);
            setError(err.message || 'Erro ao carregar projetos');
        } finally {
            setLoading(false);
        }
    }, []);

    // Buscar projetos ao montar
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // Função para calcular status do lote
    const getBatchStatus = useCallback((project: Project): string => {
        if (!project.is_batch || !project.batch_videos || project.batch_videos.length === 0) {
            return project.status;
        }

        const videos = project.batch_videos;
        const allApproved = videos.every(v => v.status === 'approved');
        if (allApproved) return 'completed';

        const hasDelivered = videos.some(v => v.status === 'delivered');
        if (hasDelivered) return 'delivered';

        const hasRevision = videos.some(v => v.status === 'revision');
        if (hasRevision) return 'revision';

        const hasInProgress = videos.some(v => v.status === 'in_progress');
        if (hasInProgress) return 'in_progress';

        return 'pending';
    }, []);

    // Agrupar projetos por status
    const groupedProjects = {
        active: projects.filter(p => {
            const status = p.is_batch ? getBatchStatus(p) : p.status;
            return ['in_progress', 'delivered', 'revision'].includes(status);
        }),
        pending: projects.filter(p => {
            const status = p.is_batch ? getBatchStatus(p) : p.status;
            return ['pending', 'draft', 'published'].includes(status);
        }),
        completed: projects.filter(p => {
            const status = p.is_batch ? getBatchStatus(p) : p.status;
            return ['completed', 'approved'].includes(status);
        }),
    };

    return {
        projects,
        groupedProjects,
        loading,
        error,
        refresh: fetchProjects,
        getBatchStatus,
    };
}
