import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SubscriptionGuard from '@/components/guards/SubscriptionGuard';
import ProjectCard from '@/components/editor/ProjectCard';
import ProjectFilters from '@/components/editor/ProjectFilters';
import EmptyState from '@/components/ui/EmptyState';
import { MarketplaceLoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Search, Filter, Briefcase, AlertCircle, Star, DollarSign, CheckCircle, MessageSquare, Clock } from 'lucide-react';
import { getEditorFavoriteCount } from '@/services/favoritesService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  const [favoriteCount, setFavoriteCount] = useState(0);

  // New states for insights
  const [inProgressProjects, setInProgressProjects] = useState<Project[]>([]);
  const [completedProjectsCount, setCompletedProjectsCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

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
    loadDashboardData();
    loadMyApplications();
    loadFavoriteCount();

    // Subscribe to real-time project updates
    const projectsSubscription = supabase
      .channel('public:projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: 'status=eq.open'
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      projectsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, projects]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      // 1. Load In Progress Projects
      const { data: inProgressData } = await supabase
        .from('projects')
        .select(`
          *,
          users:creator_id (
            full_name,
            username,
            profile_photo_url
          )
        `)
        .eq('assigned_editor_id', user.id)
        .eq('status', 'in_progress');

      setInProgressProjects(inProgressData || []);
      setCurrentProjectsCount(inProgressData?.length || 0);

      // 2. Load Completed Projects Count & Earnings
      const { data: completedData } = await supabase
        .from('projects')
        .select('base_price')
        .eq('assigned_editor_id', user.id)
        .eq('status', 'completed');

      if (completedData) {
        setCompletedProjectsCount(completedData.length);
        const earnings = completedData.reduce((sum, p) => sum + (p.base_price || 0), 0);
        setTotalEarnings(earnings);
      }

      // 3. Load Recent Messages (Mocked for now as we don't have a direct API here)
      // In a real scenario, we would fetch from 'messages' table joining with users
      // For now, let's use a placeholder or try to fetch if possible.
      // Let's try to fetch real messages if the table exists and RLS allows.
      const { data: messagesData } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(full_name, profile_photo_url)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentMessages(messagesData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

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
          users:creator_id (
            full_name,
            username,
            profile_photo_url
          )
        `)
        .eq('status', 'open')
        .eq('payment_status', 'paid')
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

      // @ts-ignore
      const projectsWithCounts = data.map(project => ({
        ...project,
        _count: {
          applications: applicationCounts[project.id] || 0
        }
      }));

      setProjects(projectsWithCounts);
      setFilteredProjects(projectsWithCounts);
    } catch (error) {
      console.error('Error loading projects:', error);
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
        .eq('editor_id', user.id)
        .in('status', ['pending', 'accepted']);

      const applicationIds = new Set<string>(data?.map(app => app.project_id) || []);
      setMyApplications(applicationIds);
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  }

  async function loadFavoriteCount() {
    if (!user) return;
    try {
      const count = await getEditorFavoriteCount(user.id);
      setFavoriteCount(count);
    } catch (error) {
      console.error('Error loading favorite count:', error);
    }
  }

  function applyFilters() {
    let filtered = [...projects];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
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

  if (loading) {
    return (
      <DashboardLayout
        userType="editor"
        title="Dashboard"
        subtitle="Carregando..."
      >
        <MarketplaceLoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userType="editor"
      title="Dashboard"
      subtitle="Visão geral e projetos disponíveis"
    >
      <div className="space-y-8">

        {/* Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {totalEarnings.toFixed(2).replace('.', ',')}</div>
              <p className="text-xs text-muted-foreground">
                Em projetos concluídos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Projetos Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedProjectsCount}</div>
              <p className="text-xs text-muted-foreground">
                Entregues com sucesso
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoriteCount}</div>
              <p className="text-xs text-muted-foreground">
                Creators que te favoritaram
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Candidaturas</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myApplications.size}</div>
              <p className="text-xs text-muted-foreground">
                Pendentes de resposta
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Projects in Progress & Marketplace */}
          <div className="lg:col-span-2 space-y-8">

            {/* Projects in Progress */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Em Andamento
              </h2>
              {inProgressProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {inProgressProjects.map(project => (
                    <div key={project.id} className="bg-card border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {project.video_type === 'reels' ? '📱' : project.video_type === 'motion' ? '🎨' : '📹'}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{project.title}</h3>
                          <p className="text-sm text-muted-foreground">Entrega em {project.deadline_days} dias</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/editor/project/${project.id}`)}>
                        Ver Projeto
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-6 text-center border border-dashed">
                  <p className="text-muted-foreground">Nenhum projeto em andamento no momento.</p>
                </div>
              )}
            </section>

            {/* Marketplace */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Novos Projetos
                </h2>
                <span className="text-sm text-muted-foreground">
                  {projects.length} disponíveis
                </span>
              </div>

              {/* Alert de Limite */}
              {currentProjectsCount >= (subscription?.subscription_plans.max_simultaneous_projects || 0) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3 mb-6">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                      Limite de Projetos Atingido
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Você atingiu o limite de {subscription?.subscription_plans.max_simultaneous_projects} projetos simultâneos.
                    </p>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="bg-card rounded-lg border p-4 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar projetos..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange({ search: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary bg-background"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  icon={Search}
                  title="Nenhum projeto encontrado"
                  description="Tente ajustar os filtros para ver mais resultados"
                  action={hasActiveFilters ? { label: 'Limpar Filtros', onClick: clearFilters } : undefined}
                />
              )}
            </section>
          </div>

          {/* Sidebar Column: Messages & Notifications */}
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Mensagens Recentes
                </h2>
                <Button variant="link" size="sm" onClick={() => navigate('/editor/messages')}>
                  Ver todas
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  {recentMessages.length > 0 ? (
                    <div className="divide-y">
                      {recentMessages.map((msg) => (
                        <div key={msg.id} className="p-4 hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => navigate('/editor/messages')}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={msg.sender?.profile_photo_url} />
                              <AvatarFallback>{msg.sender?.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.sender?.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(msg.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Nenhuma mensagem recente
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default EditorDashboard;
