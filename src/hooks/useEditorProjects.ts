import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// =====================================================
// INTERFACES
// =====================================================
export interface BatchVideo {
    id: string;
    sequence_order: number;
    title: string;
    specific_instructions: string | null;
    editor_can_choose_timing: boolean;
    selected_timestamp_start: number | null;
    selected_timestamp_end: number | null;
    status: 'pending' | 'in_progress' | 'delivered' | 'revision' | 'approved';
    revision_count: number;
    delivery_id: string | null;
    approved_at: string | null;
    payment_released_at: string | null;
    payment_amount: number;
    created_at: string;
    updated_at: string;
}

export interface EditorProject {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    duration: string;
    status: string;
    base_price: number;
    deadline: string;
    created_at: string;

    // Campos de lote
    is_batch: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: 'sequential' | 'simultaneous';
    batch_discount_percent?: number;
    videos_approved?: number;
    editor_earnings_per_video?: number;
    editor_earnings_released?: number;

    // Briefing aprimorado
    raw_footage_url?: string;
    raw_footage_duration?: string;
    brand_identity_url?: string;
    fonts_url?: string;
    music_sfx_url?: string;
    reference_links?: string;

    // Relacionamentos
    creator_id: string;
    creator_name?: string;
    creator_photo?: string;
    assigned_editor_id?: string;
    rehire_editor_id?: string;
    rehire_message?: string;

    // Vídeos do lote
    batch_videos?: BatchVideo[];
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================
export function useEditorProjects() {
    const [projects, setProjects] = useState<EditorProject[]>([]);
    const [proposals, setProposals] = useState<EditorProject[]>([]);
    const [completedCount, setCompletedCount] = useState(0);
    const [applicationsCount, setApplicationsCount] = useState(0);
    const [completedEarnings, setCompletedEarnings] = useState(0); // Novo estado
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

            // =====================================================
            // 1. BUSCAR PROJETOS ATIVOS DO EDITOR
            // =====================================================
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select(`
          *,
          creator:profiles!creator_id(
            full_name,
            avatar_url
          )
        `)
                .eq('assigned_editor_id', user.id)
                .in('status', ['in_progress', 'delivered', 'revision', 'in_review', 'revision_requested'])
                .order('updated_at', { ascending: false });

            if (projectsError) {
                console.error('Erro ao buscar projetos:', projectsError);
            }

            // =====================================================
            // 2. BUSCAR PROPOSTAS PENDENTES (Recontratação)
            // =====================================================
            const { data: proposalsData, error: proposalsError } = await supabase
                .from('projects')
                .select(`
          *,
          creator:profiles!creator_id(
            full_name,
            avatar_url
          )
        `)
                .eq('rehire_editor_id', user.id)
                .eq('status', 'pending_acceptance')
                .order('created_at', { ascending: false });

            if (proposalsError) {
                console.error('Erro ao buscar propostas:', proposalsError);
            }

            // =====================================================
            // 3. BUSCAR ESTATÍSTICAS ADICIONAIS
            // =====================================================

            // Buscar projetos concluídos (DADOS COMPLETOS para cálculo de ganhos)
            const { data: completedProjects, error: completedError } = await supabase
                .from('projects')
                .select('id, base_price, editor_earnings_released, created_at')
                .eq('assigned_editor_id', user.id)
                .eq('status', 'completed');

            if (completedError) {
                console.error('Erro ao buscar projetos concluídos:', completedError);
            }

            const { count: applications } = await supabase
                .from('project_applications')
                .select('*', { count: 'exact', head: true })
                .eq('editor_id', user.id)
                .eq('status', 'pending');

            setCompletedCount(completedProjects?.length || 0);
            setApplicationsCount(applications || 0);

            // Calcular ganhos de projetos concluídos
            const earningsFromCompleted = (completedProjects || []).reduce((acc, p) => {
                // Prioriza editor_earnings_released, senão usa base_price
                return acc + (p.editor_earnings_released || p.base_price || 0);
            }, 0);
            setCompletedEarnings(earningsFromCompleted);

            // =====================================================
            // 4. ENRICHER PROJETOS COM BATCH_VIDEOS
            // =====================================================
            const enrichWithBatchVideos = async (projectsList: any[]): Promise<EditorProject[]> => {
                return Promise.all(
                    (projectsList || []).map(async (project) => {
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
                            creator_name: project.creator?.full_name || 'Cliente',
                            creator_photo: project.creator?.avatar_url || null,
                            batch_videos: batchVideos,
                        };
                    })
                );
            };

            const enrichedProjects = await enrichWithBatchVideos(projectsData || []);
            const enrichedProposals = await enrichWithBatchVideos(proposalsData || []);

            setProjects(enrichedProjects);
            setProposals(enrichedProposals);

        } catch (err: any) {
            console.error('Erro ao buscar projetos do editor:', err);
            setError(err.message || 'Erro ao carregar projetos');
        } finally {
            setLoading(false);
        }
    }, []);

    // Buscar ao montar
    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    // =====================================================
    // FUNÇÕES AUXILIARES
    // =====================================================

    // Calcular status geral do lote
    const getBatchStatus = useCallback((project: EditorProject): string => {
        if (!project.is_batch || !project.batch_videos || project.batch_videos.length === 0) {
            return project.status;
        }

        const videos = project.batch_videos;
        const allApproved = videos.every(v => v.status === 'approved');
        if (allApproved) return 'completed';

        const hasRevision = videos.some(v => v.status === 'revision');
        if (hasRevision) return 'revision';

        const hasDelivered = videos.some(v => v.status === 'delivered');
        if (hasDelivered) return 'delivered';

        const hasInProgress = videos.some(v => v.status === 'in_progress');
        if (hasInProgress) return 'in_progress';

        return 'pending';
    }, []);

    // Encontrar próximo vídeo a trabalhar
    const getNextVideo = useCallback((project: EditorProject): BatchVideo | null => {
        if (!project.is_batch || !project.batch_videos) return null;

        // Primeiro, procurar vídeo em revisão (prioridade)
        const revisionVideo = project.batch_videos.find(v => v.status === 'revision');
        if (revisionVideo) return revisionVideo;

        // Depois, procurar vídeo em progresso
        const inProgressVideo = project.batch_videos.find(v => v.status === 'in_progress');
        if (inProgressVideo) return inProgressVideo;

        // Por último, próximo pendente (apenas em modo sequencial)
        if (project.batch_delivery_mode === 'sequential') {
            const pendingVideo = project.batch_videos.find(v => v.status === 'pending');
            return pendingVideo || null;
        }

        return null;
    }, []);

    // Calcular estatísticas
    const stats = {
        totalProjects: projects.length,
        totalProposals: proposals.length,
        totalCompleted: completedCount,
        pendingApplications: applicationsCount,
        totalVideos: projects.reduce((acc, p) => acc + (p.batch_quantity || 1), 0),
        approvedVideos: projects.reduce((acc, p) => acc + (p.videos_approved || 0), 0),
        // Ganhos = Ganhos de projetos concluídos + Ganhos liberados de projetos em andamento
        totalEarned: completedEarnings + projects.reduce((acc, p) => acc + (p.editor_earnings_released || 0), 0),
        pendingEarnings: projects.reduce((acc, p) => {
            const total = (p.editor_earnings_per_video || p.base_price * 0.85) * (p.batch_quantity || 1);
            const released = p.editor_earnings_released || 0;
            return acc + (total - released);
        }, 0),
    };

    return {
        projects,
        proposals,
        loading,
        error,
        stats,
        refresh: fetchProjects,
        getBatchStatus,
        getNextVideo,
    };
}
