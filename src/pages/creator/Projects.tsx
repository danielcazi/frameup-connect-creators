import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectKanban from '@/components/creator/ProjectKanban';
import BatchVideoKanban from '@/components/creator/BatchVideoKanban';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Project } from '@/utils/projectHelpers';

const CreatorProjects = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('recent');
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // ═══════════════════════════════════════════════════════════════════════════
    // NOVO: Estado para controle da view de lote
    // ═══════════════════════════════════════════════════════════════════════════
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

    // Projeto selecionado (para view do lote)
    const selectedBatchProject = useMemo(() => {
        if (!selectedBatchId) return null;
        return projects.find(p => p.id === selectedBatchId) || null;
    }, [selectedBatchId, projects]);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, sortBy, debouncedSearch, showArchived]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH PROJECTS COM BATCH_VIDEOS
    // ═══════════════════════════════════════════════════════════════════════════
    const fetchProjects = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Query principal otimizada com joins
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    title,
                    status,
                    base_price,
                    deadline_days,
                    created_at,
                    is_archived,
                    is_batch,
                    batch_quantity,
                    assigned_editor_id,
                    users:assigned_editor_id (
                        id,
                        full_name,
                        username,
                        profile_photo_url
                    ),
                    batch_videos (
                        id,
                        project_id,
                        sequence_order,
                        title,
                        status,
                        revision_count
                    ),
                    project_applications (count)
                `)
                .eq('creator_id', user.id)
                .order('created_at', { ascending: sortBy === 'oldest' });

            if (error) throw error;

            // Filtrar por busca no frontend
            let filteredProjects = data || [];
            if (debouncedSearch) {
                const searchLower = debouncedSearch.toLowerCase();
                filteredProjects = filteredProjects.filter(p =>
                    p.title.toLowerCase().includes(searchLower)
                );
            }

            // Buscar informações de review separadamente (mais seguro/simples do que complexidade no join)
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('project_id')
                .eq('reviewer_id', user.id);

            const reviewedProjectIds = new Set((reviewsData || []).map(r => r.project_id));

            // Processar dados para o formato esperado
            const finalProjects = filteredProjects.map(project => ({
                ...project,
                // Garantir ordenação dos batch_videos
                batch_videos: project.batch_videos?.sort((a: any, b: any) => a.sequence_order - b.sequence_order) || [],
                // Mapear assigned_editor do join
                assigned_editor: project.users,
                // Mapear contagem de applications
                _count: {
                    applications: project.project_applications?.[0]?.count || 0
                },
                has_reviewed: reviewedProjectIds.has(project.id)
            }));

            // Force cast to Project type if needed, but structure should match
            setProjects(finalProjects as unknown as Project[]);

        } catch (error) {
            console.error('Error:', error);
            toast({
                title: "Erro ao carregar projetos",
                description: "Não foi possível carregar seus projetos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewProject = () => {
        navigate('/creator/project/new');
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS PARA NAVEGAÇÃO DO LOTE
    // ═══════════════════════════════════════════════════════════════════════════
    const handleOpenBatch = (batchId: string) => {
        setSelectedBatchId(batchId);
    };

    const handleBackFromBatch = () => {
        setSelectedBatchId(null);
    };

    // Filtrar projetos
    const filteredProjects = projects.filter(project => {
        const isArchived = project.is_archived === true;
        if (showArchived) return isArchived;
        return !isArchived;
    });

    const displayProjects = filteredProjects.map(p => ({
        ...p,
        status: showArchived ? 'archived' : p.status
    }));

    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS DE ARQUIVAMENTO
    // ═══════════════════════════════════════════════════════════════════════════
    const handleArchive = async (projectId: string) => {
        try {
            // Optimistic update
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, is_archived: true } : p
            ));

            const { error } = await supabase
                .from('projects')
                .update({ is_archived: true })
                .eq('id', projectId);

            if (error) {
                // Rollback
                setProjects(prev => prev.map(p =>
                    p.id === projectId ? { ...p, is_archived: false } : p
                ));
                throw error;
            }

            toast({
                title: "Projeto arquivado",
                description: "O projeto foi movido para os arquivados.",
            });
        } catch (error) {
            console.error('Error archiving project:', error);
            toast({
                title: "Erro ao arquivar",
                description: "Não foi possível arquivar o projeto.",
                variant: "destructive"
            });
        }
    };

    const handleUnarchive = async (projectId: string) => {
        try {
            // Optimistic update
            setProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, is_archived: false } : p
            ));

            const { error } = await supabase
                .from('projects')
                .update({ is_archived: false })
                .eq('id', projectId);

            if (error) {
                // Rollback
                setProjects(prev => prev.map(p =>
                    p.id === projectId ? { ...p, is_archived: true } : p
                ));
                throw error;
            }

            toast({
                title: "Projeto desarquivado",
                description: "O projeto voltou para a lista principal.",
            });
        } catch (error) {
            console.error('Error unarchiving project:', error);
            toast({
                title: "Erro ao desarquivar",
                description: "Não foi possível desarquivar o projeto.",
                variant: "destructive"
            });
        }
    };

    // Loading de autenticação
    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            userType="creator"
            title={selectedBatchProject ? `Projeto: ${selectedBatchProject.title}` : "Meus Projetos"}
            subtitle={selectedBatchProject
                ? `${selectedBatchProject.batch_videos?.length || 0} vídeos no lote`
                : "Gerencie todos os seus projetos"
            }
            headerAction={
                !selectedBatchId && (
                    <Button onClick={handleNewProject}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Projeto
                    </Button>
                )
            }
        >
            {/* ═══════════════════════════════════════════════════════════════════
                FILTROS - Ocultar quando estiver na view de lote
            ═══════════════════════════════════════════════════════════════════ */}
            {!selectedBatchId && (
                <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar projetos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto items-center">
                        <Button
                            variant={showArchived ? "default" : "outline"}
                            onClick={() => setShowArchived(!showArchived)}
                            className="gap-2"
                        >
                            <Archive className="w-4 h-4" />
                            {showArchived ? 'Ver Projetos Ativos' : 'Arquivados'}
                        </Button>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder="Ordenar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Mais Recente</SelectItem>
                                <SelectItem value="oldest">Mais Antigo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-6 w-6 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-24 w-full rounded-lg" />
                                <Skeleton className="h-24 w-full rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !selectedBatchId && filteredProjects.length === 0 && (
                <EmptyState
                    illustration="projects"
                    title={searchTerm
                        ? "Nenhum projeto encontrado"
                        : (showArchived ? "Nenhum projeto arquivado" : "Nenhum projeto ainda")
                    }
                    description={searchTerm
                        ? "Tente buscar com outros termos."
                        : (showArchived
                            ? "Você não tem projetos arquivados."
                            : "Crie seu primeiro projeto e encontre o editor perfeito para seu conteúdo."
                        )
                    }
                    action={!searchTerm && !showArchived ? {
                        label: "Criar Primeiro Projeto",
                        onClick: handleNewProject,
                        variant: "default",
                    } : undefined}
                />
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                VIEWS - Alternar entre view principal e view do lote
            ═══════════════════════════════════════════════════════════════════ */}
            {!loading && filteredProjects.length > 0 && (
                <>
                    {selectedBatchId && selectedBatchProject ? (
                        // VIEW DO LOTE
                        <BatchVideoKanban
                            project={selectedBatchProject}
                            onBack={handleBackFromBatch}
                        />
                    ) : (
                        // VIEW PRINCIPAL
                        <ProjectKanban
                            projects={displayProjects}
                            isArchivedView={showArchived}
                            onOpenBatch={handleOpenBatch}
                            onArchive={handleArchive}
                            onUnarchive={handleUnarchive}
                        />
                    )}
                </>
            )}
        </DashboardLayout>
    );
};

export default CreatorProjects;
