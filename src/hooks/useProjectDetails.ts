import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// =====================================================
// INTERFACES
// =====================================================
export interface EditorProfile {
    bio: string;
    city: string;
    state: string;
    specialties: string[];
    software_skills: string[];
    rating_average: number;
    total_projects: number;
    total_reviews: number;
}

export interface Application {
    id: string;
    message: string;
    portfolio_video_url?: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    editor: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
        editor_profiles: EditorProfile | EditorProfile[] | null;
    };
}

export interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title: string;
    specific_instructions: string | null;
    editor_can_choose_timing: boolean;
    selected_timestamp_start: number | null;
    selected_timestamp_end: number | null;
    status: 'pending' | 'in_progress' | 'delivered' | 'revision' | 'approved';
    revision_count: number;
    paid_extra_revisions: boolean;
    delivery_id: string | null;
    approved_at: string | null;
    payment_released_at: string | null;
    payment_amount: number;
    delivery_url?: string;
    created_at: string;
    updated_at: string;
}

export interface Delivery {
    id: string;
    project_id: string;
    batch_video_id: string | null;
    video_url: string;
    notes: string | null;
    version: number;
    status: 'pending_review' | 'approved' | 'revision_requested';
    delivered_by: string;
    delivered_at: string;
    approved_at: string | null;
    approved_by: string | null;
    feedback: string | null;
    revision_notes: string | null;
    revision_requested_at: string | null;
    revision_requested_by: string | null;
    created_at: string;
}

export interface ProjectDetails {
    id: string;
    title: string;
    description: string;
    status: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    deadline_at: string;
    current_applications: number; // 🆕 Count of applications
    recent_applications?: Application[]; // 🆕 Recent applications for preview

    // Campos de Lote
    is_batch: boolean;
    batch_quantity: number | null;
    batch_delivery_mode: 'sequential' | 'simultaneous' | null;
    batch_discount_percent: number | null;
    videos_approved: number;
    editor_earnings_per_video: number;
    editor_earnings_released: number;

    // Material do Projeto
    raw_footage_url: string | null;
    raw_footage_duration: string | null;
    brand_identity_url: string | null;
    fonts_url: string | null;
    music_sfx_url: string | null;
    reference_links: string | null;

    // Relacionamentos
    creator_id: string;
    assigned_editor_id: string | null;
    rehire_editor_id: string | null;

    // Dados enriquecidos
    creator_name: string;
    creator_photo: string | null;
    editor_name: string | null;
    editor_photo: string | null;

    // Arrays relacionados
    batch_videos: BatchVideo[];
    deliveries: Delivery[];

    // Timestamps
    created_at: string;
    updated_at: string;
    accepted_at: string | null;
    completed_at: string | null;
    revision_count?: number; // 🆕 Added for single projects
}

interface UseProjectDetailsReturn {
    project: ProjectDetails | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================
export function useProjectDetails(projectId: string): UseProjectDetailsReturn {
    const [project, setProject] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjectDetails = useCallback(async () => {
        if (!projectId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 1. Buscar projeto com usuários relacionados
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select(`
          *,
          creator:users!projects_creator_id_fkey(
            id,
            full_name,
            profile_photo_url
          ),
          editor:users!projects_assigned_editor_id_fkey(
            id,
            full_name,
            profile_photo_url
          )
        `)
                .eq('id', projectId)
                .single();

            if (projectError) {
                console.error('Erro ao buscar projeto:', projectError);
                throw new Error('Erro ao carregar projeto');
            }

            if (!projectData) {
                throw new Error('Projeto não encontrado');
            }

            // 2. Se for lote, buscar batch_videos
            let batchVideos: BatchVideo[] = [];
            if (projectData.is_batch) {
                const { data: videosData, error: videosError } = await supabase
                    .from('batch_videos')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('sequence_order', { ascending: true });

                if (videosError) {
                    console.error('Erro ao buscar vídeos do lote:', videosError);
                } else {
                    batchVideos = videosData || [];
                }
            }

            // 3. Buscar todas as entregas do projeto
            const { data: deliveriesData, error: deliveriesError } = await supabase
                .from('project_deliveries')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (deliveriesError) {
                console.error('Erro ao buscar entregas:', deliveriesError);
            }

            if (deliveriesError) {
                console.error('Erro ao buscar entregas:', deliveriesError);
            }

            // 4. Se não tiver editor, buscar últimas candidaturas
            let recentApplications: Application[] = [];
            if (!projectData.assigned_editor_id) {
                const { data: appsData, error: appsError } = await supabase
                    .from('project_applications')
                    .select(`
                        id,
                        message,
                        portfolio_video_url,
                        status,
                        created_at,
                        editor:editor_id (
                            id,
                            full_name,
                            username,
                            profile_photo_url,
                            editor_profiles (
                                bio,
                                city,
                                state,
                                specialties,
                                software_skills,
                                rating_average,
                                total_projects,
                                total_reviews
                            )
                        )
                    `)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (appsError) {
                    console.error('Erro ao buscar candidaturas:', appsError);
                } else {
                    // @ts-ignore
                    recentApplications = appsData || [];
                }
            }

            // 5. Montar objeto final
            const enrichedProject: ProjectDetails = {
                ...projectData,
                creator_name: projectData.creator?.full_name || 'Cliente',
                creator_photo: projectData.creator?.profile_photo_url || null,
                editor_name: projectData.editor?.full_name || null,
                editor_photo: projectData.editor?.profile_photo_url || null,
                batch_videos: batchVideos,
                deliveries: deliveriesData || [],
                recent_applications: recentApplications,
                // Garantir valores padrão
                videos_approved: projectData.videos_approved || 0,
                editor_earnings_per_video: projectData.editor_earnings_per_video || 0,
                editor_earnings_released: projectData.editor_earnings_released || 0,

                // Mapeamento de campos que podem faltar ou ter nomes diferentes
                duration_category: projectData.duration || projectData.duration_category,
                deadline_at: projectData.deadline_at || (() => {
                    if (!projectData.created_at || !projectData.deadline_days) return new Date().toISOString();
                    const date = new Date(projectData.created_at);
                    date.setDate(date.getDate() + (projectData.deadline_days || 0));
                    return date.toISOString();
                })(),
            };

            setProject(enrichedProject);

        } catch (err: any) {
            console.error('Erro em useProjectDetails:', err);
            setError(err.message || 'Erro ao carregar projeto');
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Buscar dados iniciais
    useEffect(() => {
        fetchProjectDetails();
    }, [fetchProjectDetails]);

    // Configurar realtime subscription para atualizações
    useEffect(() => {
        if (!projectId) return;

        // Subscription para o projeto
        const projectSubscription = supabase
            .channel(`project-${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `id=eq.${projectId}`
                },
                () => {
                    fetchProjectDetails();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'batch_videos',
                    filter: `project_id=eq.${projectId}`
                },
                () => {
                    fetchProjectDetails();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_deliveries',
                    filter: `project_id=eq.${projectId}`
                },
                () => {
                    fetchProjectDetails();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(projectSubscription);
        };
    }, [projectId, fetchProjectDetails]);

    return {
        project,
        loading,
        error,
        refresh: fetchProjectDetails,
    };
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Retorna o próximo vídeo que o editor deve trabalhar
 */
export function getNextVideoToWork(videos: BatchVideo[]): BatchVideo | null {
    // Prioridade: revisão > in_progress > pending (apenas o primeiro)
    const revision = videos.find(v => v.status === 'revision');
    if (revision) return revision;

    const inProgress = videos.find(v => v.status === 'in_progress');
    if (inProgress) return inProgress;

    return null;
}

/**
 * Retorna o próximo vídeo que o cliente deve revisar
 * Busca vídeos com status 'delivered' que aguardam revisão
 */
export function getNextVideoToReview(videos: BatchVideo[]): BatchVideo | null {
    // Status 'delivered' indica que o vídeo foi entregue e aguarda revisão
    // Conforme documentação: batch_videos.status = 'delivered' após entrega do editor
    return videos.find(v => v.status === 'delivered') || null;
}

/**
 * Calcula estatísticas do lote
 */
export function getBatchStats(videos: BatchVideo[]) {
    const total = videos.length;
    const approved = videos.filter(v => v.status === 'approved').length;
    const delivered = videos.filter(v => v.status === 'delivered').length;
    const inProgress = videos.filter(v => v.status === 'in_progress').length;
    const revision = videos.filter(v => v.status === 'revision').length;
    const pending = videos.filter(v => v.status === 'pending').length;

    return {
        total,
        approved,
        delivered,
        inProgress,
        revision,
        pending,
        percentComplete: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
}
