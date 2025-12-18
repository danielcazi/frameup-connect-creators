import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Archive, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectKanban from '@/components/editor/ProjectKanban';
import BatchVideoKanban from '@/components/editor/BatchVideoKanban';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title: string;
    status: string;
    revision_count?: number;
    delivery_url?: string;
}

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    is_archived?: boolean;
    is_batch?: boolean;
    batch_quantity?: number;
    batch_videos?: BatchVideo[];
    revision_count?: number;
    users?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

const EditorMyProjects = () => {
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
    // ESTADO PARA CONTROLE DA VIEW DE LOTE (IGUAL AO CREATOR)
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
            fetchMyProjects();
        }
    }, [user, sortBy, debouncedSearch, showArchived]);

    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH PROJECTS COM BATCH_VIDEOS
    // ═══════════════════════════════════════════════════════════════════════════
    const fetchMyProjects = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Query única com todos os dados necessários
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
                    users:creator_id (
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
                        revision_count,
                        delivery_url
                    )
                `)
                .eq('assigned_editor_id', user.id)
                .order('created_at', { ascending: sortBy === 'oldest' });

            if (error) throw error;

            // Filtrar por busca no frontend (mais rápido para poucos projetos)
            let filteredData = data || [];
            if (debouncedSearch) {
                const searchLower = debouncedSearch.toLowerCase();
                filteredData = filteredData.filter(p =>
                    p.title.toLowerCase().includes(searchLower)
                );
            }

            // Ordenar batch_videos (o Supabase pode não garantir a ordem no join aninhado dependendo da versão, mas podemos garantir aqui ou tentar no select)
            // Para garantir:
            const projectsWithSortedVideos = filteredData.map(p => ({
                ...p,
                batch_videos: p.batch_videos?.sort((a: BatchVideo, b: BatchVideo) => a.sequence_order - b.sequence_order) || []
            }));

            setProjects(projectsWithSortedVideos);
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast({
                title: "Erro ao carregar projetos",
                description: "Não foi possível carregar seus projetos.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
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
            userType="editor"
            title={selectedBatchProject ? `Projeto: ${selectedBatchProject.title}` : "Meus Projetos"}
            subtitle={selectedBatchProject
                ? `${selectedBatchProject.batch_videos?.length || 0} vídeos no lote`
                : "Gerencie os projetos em que você está trabalhando"
            }
            headerAction={
                !selectedBatchId && (
                    <Button onClick={() => navigate('/editor/find-projects')}>
                        <Search className="mr-2 h-4 w-4" />
                        Encontrar Projetos
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
                            {showArchived ? 'Ver Ativos' : 'Arquivados'}
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
                            : "Candidate-se a projetos para começar a trabalhar."
                        )
                    }
                    action={!searchTerm && !showArchived ? {
                        label: "Encontrar Projetos",
                        onClick: () => navigate('/editor/find-projects'),
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
                        />
                    )}
                </>
            )}
        </DashboardLayout>
    );
};

export default EditorMyProjects;
