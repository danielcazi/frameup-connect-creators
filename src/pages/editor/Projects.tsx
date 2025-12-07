import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Briefcase, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProjectCard from '@/components/editor/ProjectCard';
import ProjectFilters from '@/components/editor/ProjectFilters';
import EmptyState from '@/components/common/EmptyState';
import { MarketplaceLoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface Project {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    status?: string;
    users: {
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    _count?: {
        applications: number;
    };
}

interface Filters {
    videoType: string[];
    editingStyle: string[];
    minBudget: number;
    maxBudget: number;
    maxDeadline: number;
    search: string;
}

const EditorProjects = () => {
    const { user, loading: authLoading } = useAuth();
    const { subscription } = useSubscription();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [myApplications, setMyApplications] = useState<Set<string>>(new Set());
    const [currentProjectsCount, setCurrentProjectsCount] = useState(0);

    const [filters, setFilters] = useState<Filters>({
        videoType: [],
        editingStyle: [],
        minBudget: 0,
        maxBudget: 10000,
        maxDeadline: 30,
        search: '',
    });

    const debouncedSearch = useDebounce(filters.search, 500);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            loadProjects();
            loadMyApplications();
            loadCurrentProjectsCount();
        }
    }, [user]);

    useEffect(() => {
        applyFilters();
    }, [filters, projects, debouncedSearch]);

    async function loadProjects() {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('projects')
                .select(`
          id,
          title,
          description,
          video_type,
          editing_style,
          duration_category,
          base_price,
          deadline_days,
          created_at,
          status,
          creator_id
        `)
                .eq('status', 'open')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Count applications
            const projectIds = data.map(p => p.id);
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

            // Manual fetch for creator details
            const creatorIds = Array.from(new Set(data.map(p => p.creator_id).filter(Boolean)));
            let creatorsMap: Record<string, any> = {};

            if (creatorIds.length > 0) {
                const { data: creatorsData } = await supabase
                    .from('users')
                    .select('id, full_name, username, profile_photo_url')
                    .in('id', creatorIds);

                if (creatorsData) {
                    creatorsMap = creatorsData.reduce((acc, c) => ({ ...acc, [c.id]: c }), {});
                }
            }

            // @ts-ignore
            const projectsWithCounts = data.map(project => ({
                ...project,
                users: creatorsMap[project.creator_id] || { full_name: 'Desconhecido', username: 'unknown' },
                _count: {
                    applications: applicationCounts[project.id] || 0
                }
            }));

            setProjects(projectsWithCounts);
            setFilteredProjects(projectsWithCounts);
        } catch (error) {
            console.error('Error loading projects:', error);
            toast({
                title: "Erro ao carregar projetos",
                description: "Não foi possível carregar a lista de projetos. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadMyApplications() {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('project_applications')
                .select('project_id')
                .eq('editor_id', user.id);

            const applicationIds = new Set<string>(data?.map(app => app.project_id) || []);
            setMyApplications(applicationIds);
        } catch (error) {
            console.error('Error loading applications:', error);
        }
    }

    async function loadCurrentProjectsCount() {
        if (!user) return;
        try {
            const { count } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_editor_id', user.id)
                .eq('status', 'in_progress');

            setCurrentProjectsCount(count || 0);
        } catch (error) {
            console.error('Error loading current projects count:', error);
        }
    }

    function applyFilters() {
        let filtered = [...projects];

        if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
                p =>
                    p.title.toLowerCase().includes(searchLower) ||
                    p.description.toLowerCase().includes(searchLower) ||
                    p.users.full_name.toLowerCase().includes(searchLower)
            );
        }

        if (filters.videoType.length > 0) {
            filtered = filtered.filter(p => filters.videoType.includes(p.video_type));
        }

        if (filters.editingStyle.length > 0) {
            filtered = filtered.filter(p => filters.editingStyle.includes(p.editing_style));
        }

        filtered = filtered.filter(
            p => p.base_price >= filters.minBudget && p.base_price <= filters.maxBudget
        );

        if (filters.maxDeadline < 30) {
            filtered = filtered.filter(p => p.deadline_days <= filters.maxDeadline);
        }

        setFilteredProjects(filtered);
    }

    function handleFilterChange(newFilters: Partial<Filters>) {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }

    function clearFilters() {
        setFilters({
            videoType: [],
            editingStyle: [],
            minBudget: 0,
            maxBudget: 10000,
            maxDeadline: 30,
            search: '',
        });
    }

    const hasActiveFilters =
        filters.videoType.length > 0 ||
        filters.editingStyle.length > 0 ||
        filters.minBudget > 0 ||
        filters.maxBudget < 10000 ||
        filters.maxDeadline < 30;

    if (authLoading || loading) {
        return (
            <DashboardLayout
                userType="editor"
                title="Encontrar Projetos"
                subtitle="Carregando..."
            >
                <MarketplaceLoadingSkeleton />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType="editor"
            title="Encontrar Projetos"
            subtitle="Explore oportunidades e candidate-se a novos projetos"
        >
            <div className="space-y-6">
                {/* Alert de Limite */}
                {currentProjectsCount >= (subscription?.subscription_plans.max_simultaneous_projects || 0) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                                Limite de Projetos Atingido
                            </p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Você atingiu o limite de {subscription?.subscription_plans.max_simultaneous_projects} projetos simultâneos.
                                Conclua projetos atuais para se candidatar a novos.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="bg-card rounded-lg border p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por título, descrição ou creator..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange({ search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary bg-background"
                                aria-label="Buscar projetos"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters || hasActiveFilters
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-background border-input hover:bg-accent'
                                }`}
                        >
                            <Filter className="w-5 h-5" />
                            <span>Filtros</span>
                        </button>
                    </div>
                    {showFilters && (
                        <ProjectFilters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={clearFilters}
                            hasActiveFilters={hasActiveFilters}
                        />
                    )}
                </div>

                {/* Projects Grid */}
                {filteredProjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                hasApplied={myApplications.has(project.id)}
                                canApply={
                                    currentProjectsCount < (subscription?.subscription_plans.max_simultaneous_projects || 0)
                                }
                                onApply={() => navigate(`/editor/project/${project.id}`)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        illustration="projects"
                        title="Nenhum projeto encontrado"
                        description="Tente ajustar os filtros para ver mais resultados"
                        action={hasActiveFilters ? { label: 'Limpar Filtros', onClick: clearFilters, variant: 'outline' } : undefined}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

export default EditorProjects;
