import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/creator/ProjectCard';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    updated_at: string;
    _count?: {
        applications: number;
    };
    assigned_editor?: {
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

const CreatorProjects = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('recent');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, statusFilter, sortBy, debouncedSearch]);

    const fetchProjects = async () => {
        if (!user) return;

        setLoading(true);
        try {
            let query = supabase
                .from('projects')
                .select('*')
                .eq('creator_id', user.id);

            // Apply status filter
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply search
            if (debouncedSearch) {
                query = query.ilike('title', `%${debouncedSearch}%`);
            }

            // Apply sorting
            query = query.order('created_at', { ascending: sortBy === 'oldest' });

            const { data, error } = await query;

            if (error) throw error;

            // Collect assigned editor IDs
            const editorIds = Array.from(new Set(data?.map(p => p.assigned_editor_id).filter(Boolean) || []));

            // Fetch editor profiles separately
            let editorsMap: Record<string, any> = {};
            if (editorIds.length > 0) {
                const { data: editorsData } = await supabase
                    .from('users')
                    .select('id, full_name, username, profile_photo_url')
                    .in('id', editorIds);

                if (editorsData) {
                    editorsMap = editorsData.reduce((acc, editor) => {
                        acc[editor.id] = editor;
                        return acc;
                    }, {} as Record<string, any>);
                }
            }

            // Load application counts for each project
            const projectIds = data?.map(p => p.id) || [];
            let applicationCounts: Record<string, number> = {};

            if (projectIds.length > 0) {
                const { data: applicationsData } = await supabase
                    .from('project_applications')
                    .select('project_id')
                    .in('project_id', projectIds);

                applicationCounts = applicationsData?.reduce((acc, app) => {
                    acc[app.project_id] = (acc[app.project_id] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>) || {};
            }

            // Load reviewed project IDs
            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('project_id')
                .eq('reviewer_id', user.id);

            const reviewedProjectIds = new Set(reviewsData?.map(r => r.project_id));

            // Transform projects to include _count, has_reviewed, and assigned_editor
            const projectsWithCounts = data?.map(project => ({
                ...project,
                _count: {
                    applications: applicationCounts[project.id] || 0
                },
                has_reviewed: reviewedProjectIds.has(project.id),
                assigned_editor: project.assigned_editor_id ? editorsMap[project.assigned_editor_id] : null
            })) || [];

            setProjects(projectsWithCounts);
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast({
                title: "Erro ao carregar projetos",
                description: "Não foi possível carregar seus projetos. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewProject = () => {
        navigate('/creator/project/new');
    };

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
            title="Meus Projetos"
            subtitle="Gerencie todos os seus projetos"
            headerAction={
                <Button onClick={handleNewProject}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Projeto
                </Button>
            }
        >
            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar projetos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                        aria-label="Buscar projetos"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="open">Aguardando Editor</SelectItem>
                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                            <SelectItem value="in_review">Em Revisão</SelectItem>
                            <SelectItem value="completed">Concluídos</SelectItem>
                            <SelectItem value="cancelled">Cancelados</SelectItem>
                        </SelectContent>
                    </Select>

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

            {/* Projects List */}
            <div className="space-y-4">
                {loading && (
                    <>
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </>
                )}

                {!loading && projects.length === 0 && (
                    <EmptyState
                        illustration="projects"
                        title={searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto ainda"}
                        description={searchTerm ? "Tente buscar com outros termos." : "Crie seu primeiro projeto e encontre o editor perfeito para seu conteúdo."}
                        action={!searchTerm ? {
                            label: "Criar Primeiro Projeto",
                            onClick: handleNewProject,
                            variant: "default",
                        } : undefined}
                    />
                )}

                {!loading && projects.map(project => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        </DashboardLayout>
    );
};

export default CreatorProjects;
