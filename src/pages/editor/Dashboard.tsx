import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SubscriptionGuard from '@/components/guards/SubscriptionGuard';
import ProjectCard from '@/components/editor/ProjectCard';
import ProjectFilters from '@/components/editor/ProjectFilters';
import EmptyState from '@/components/common/EmptyState';
import { Search, Filter, Briefcase, Loader2, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  video_type: string;
  editing_style: string;
  duration: string;
  base_price: number;
  deadline_days: number;
  created_at: string;
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

function EditorDashboard() {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentProjectsCount, setCurrentProjectsCount] = useState(0);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    videoType: [],
    editingStyle: [],
    minBudget: 0,
    maxBudget: 10000,
    maxDeadline: 30,
    search: '',
  });

  useEffect(() => {
    loadProjects();
    loadCurrentProjectsCount();
    loadMyApplications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, projects]);

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
          duration,
          base_price,
          deadline_days,
          created_at,
          users!projects_creator_id_fkey (
            full_name,
            username,
            profile_photo_url
          )
        `)
        .eq('status', 'open')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count applications per project
      const projectIds = data?.map(p => p.id) || [];
      if (projectIds.length > 0) {
        const { data: applicationsData } = await supabase
          .from('project_applications')
          .select('project_id')
          .in('project_id', projectIds);

        const applicationCounts = applicationsData?.reduce((acc, app) => {
          acc[app.project_id] = (acc[app.project_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const projectsWithCounts = data.map(project => ({
          ...project,
          _count: {
            applications: applicationCounts[project.id] || 0
          }
        }));

        setProjects(projectsWithCounts);
        setFilteredProjects(projectsWithCounts);
      } else {
        setProjects([]);
        setFilteredProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentProjectsCount() {
    try {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_editor_id', user?.id)
        .eq('status', 'in_progress');

      setCurrentProjectsCount(count || 0);
    } catch (error) {
      console.error('Error loading projects count:', error);
    }
  }

  async function loadMyApplications() {
    try {
      const { data } = await supabase
        .from('project_applications')
        .select('project_id')
        .eq('editor_id', user?.id)
        .in('status', ['pending', 'accepted']);

      const applicationIds = new Set<string>(data?.map(app => app.project_id as string) || []);
      setMyApplications(applicationIds);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  }

  function applyFilters() {
    let filtered = [...projects];

    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.title.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.users.full_name.toLowerCase().includes(searchLower)
      );
    }

    // Video type filter
    if (filters.videoType.length > 0) {
      filtered = filtered.filter(p => filters.videoType.includes(p.video_type));
    }

    // Editing style filter
    if (filters.editingStyle.length > 0) {
      filtered = filtered.filter(p => filters.editingStyle.includes(p.editing_style));
    }

    // Budget filter
    filtered = filtered.filter(
      p => p.base_price >= filters.minBudget && p.base_price <= filters.maxBudget
    );

    // Deadline filter
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

  if (loading) {
    return (
      <SubscriptionGuard requireActive={true}>
        <DashboardLayout
          userType="editor"
          title="Marketplace"
          subtitle="Carregando projetos..."
        >
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </SubscriptionGuard>
    );
  }

  return (
    <SubscriptionGuard requireActive={true}>
      <DashboardLayout
        userType="editor"
        title="Marketplace"
        subtitle="Encontre projetos perfeitos para você"
      >
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Projetos Disponíveis</span>
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold text-foreground">{projects.length}</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Projetos Ativos</span>
                <Briefcase className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-foreground">
                {currentProjectsCount} /{' '}
                {subscription?.subscription_plans.max_simultaneous_projects}
              </p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Candidaturas Pendentes</span>
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-foreground">{myApplications.size}</p>
            </div>
          </div>

          {/* Alert de Limite */}
          {currentProjectsCount >= (subscription?.subscription_plans.max_simultaneous_projects || 0) && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Limite de Projetos Atingido
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Você atingiu o limite de {subscription?.subscription_plans.max_simultaneous_projects} projetos simultâneos do seu plano.
                  Complete um projeto antes de se candidatar a novos.
                </p>
              </div>
            </div>
          )}

          {/* Search and Filters Bar */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por título, descrição ou criador..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-input text-foreground"
                />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border text-foreground hover:bg-accent'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span className="font-medium">Filtros</span>
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                    Ativos
                  </span>
                )}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <ProjectFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {filteredProjects.length === projects.length ? (
                <>{filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''} disponível{filteredProjects.length !== 1 ? 'eis' : ''}</>
              ) : (
                <>{filteredProjects.length} de {projects.length} projeto{projects.length !== 1 ? 's' : ''}</>
              )}
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:text-primary/80 font-medium"
              >
                Limpar filtros
              </button>
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
              illustration="search"
              title="Nenhum projeto encontrado"
              description={
                hasActiveFilters
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Novos projetos aparecerão aqui em breve'
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Limpar Filtros',
                      onClick: clearFilters,
                    }
                  : undefined
              }
            />
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}

export default EditorDashboard;
