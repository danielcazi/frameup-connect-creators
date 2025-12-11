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
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, Filter, Briefcase, AlertCircle, Star, DollarSign, CheckCircle, MessageSquare, Clock, ChevronRight, FileText } from 'lucide-react';
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
  maxDeadline: number;
  search: string;
  sortBy: string;
}

interface PendingApplication {
  id: string;
  status: string;
  created_at: string;
  project: {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    base_price: number;
    deadline_days: number;
    creator: {
      id: string;
      full_name: string;
      username: string;
      profile_photo_url?: string;
    };
  };
}

function EditorDashboard() {
  const { user } = useAuth();
  const { subscription, hasActiveSubscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [currentProjectsCount, setCurrentProjectsCount] = useState(0);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());
  const [favoriteCount, setFavoriteCount] = useState(0);

  // States para insights
  const [inProgressProjects, setInProgressProjects] = useState<Project[]>([]);
  const [completedProjectsCount, setCompletedProjectsCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  // Novo state para candidaturas pendentes
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [showAllPendingApplications, setShowAllPendingApplications] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    videoType: [],
    editingStyle: [],
    maxDeadline: 30,
    search: '',
    sortBy: 'newest',
  });

  const debouncedSearch = useDebounce(filters.search, 500);

  useEffect(() => {
    loadProjects();
    loadDashboardData();
    loadMyApplications();
    loadFavoriteCount();
    loadPendingApplications();

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
  }, [filters, projects, debouncedSearch]);

  async function loadDashboardData() {
    if (!user) return;

    try {
      // 1. Load In Progress Projects
      const { data: inProgressData } = await supabase
        .from('projects')
        .select('*')
        .eq('assigned_editor_id', user.id)
        .in('status', ['in_progress', 'in_review', 'revision_requested']);

      let projectsWithCreator = [];
      if (inProgressData && inProgressData.length > 0) {
        const creatorIds = Array.from(new Set(inProgressData.map(p => p.creator_id).filter(Boolean)));
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

        projectsWithCreator = inProgressData.map(p => ({
          ...p,
          users: creatorsMap[p.creator_id] || { full_name: 'Desconhecido', username: 'unknown' }
        }));
      }

      setInProgressProjects(projectsWithCreator);
      setCurrentProjectsCount(projectsWithCreator.length);

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

      // 3. Load Recent Messages (APENAS DE CREATORS)
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50); // Buscar mais para filtrar depois

      if (messagesData && messagesData.length > 0) {
        // Buscar informações de todos os usuários envolvidos
        const userIds = Array.from(new Set(
          messagesData.flatMap(m => [m.sender_id, m.receiver_id])
        )).filter(id => id !== user.id);

        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, username, profile_photo_url, user_type')
          .in('id', userIds);

        const usersMap = (usersData || []).reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

        // Filtrar apenas mensagens com creators
        const creatorMessages = messagesData.filter(msg => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          const otherUser = usersMap[otherUserId];
          return otherUser?.user_type === 'creator';
        });

        // Pegar apenas a última mensagem de cada conversa
        const uniqueConversations = new Map();
        creatorMessages.forEach(msg => {
          const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
          if (!uniqueConversations.has(otherUserId)) {
            uniqueConversations.set(otherUserId, {
              ...msg,
              sender: usersMap[otherUserId]
            });
          }
        });

        const recentCreatorMessages = Array.from(uniqueConversations.values()).slice(0, 3);
        setRecentMessages(recentCreatorMessages);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar informações do dashboard.",
        variant: "destructive"
      });
    }
  }

  async function loadProjects() {
    if (!user) return;

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

      // Buscar applications do editor atual
      const { data: myApplicationsData } = await supabase
        .from('project_applications')
        .select('project_id')
        .eq('editor_id', user.id);

      const appliedProjectIds = new Set(myApplicationsData?.map(app => app.project_id) || []);

      // Filtrar projetos: REMOVER aqueles que o editor já se candidatou
      const projectsNotApplied = data.filter(project => !appliedProjectIds.has(project.id));

      const projectsWithCounts = projectsNotApplied.map(project => ({
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

  async function loadFavoriteCount() {
    if (!user) return;
    try {
      const count = await getEditorFavoriteCount(user.id);
      setFavoriteCount(count);
    } catch (error) {
      console.error('Error loading favorite count:', error);
    }
  }

  async function loadPendingApplications() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select(`
          id,
          status,
          created_at,
          project:projects(
            id,
            title,
            description,
            video_type,
            editing_style,
            base_price,
            deadline_days,
            creator_id
          )
        `)
        .eq('editor_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar informações dos creators
      if (data && data.length > 0) {
        const creatorIds = Array.from(new Set(
          data.map(app => app.project?.creator_id).filter(Boolean)
        ));

        const { data: creatorsData } = await supabase
          .from('users')
          .select('id, full_name, username, profile_photo_url')
          .in('id', creatorIds);

        const creatorsMap = (creatorsData || []).reduce(
          (acc, c) => ({ ...acc, [c.id]: c }),
          {} as Record<string, any>
        );

        const applicationsWithCreators = data.map(app => ({
          ...app,
          project: {
            ...app.project,
            creator: creatorsMap[app.project?.creator_id] || {
              id: '',
              full_name: 'Desconhecido',
              username: 'unknown'
            }
          }
        }));

        setPendingApplications(applicationsWithCreators as PendingApplication[]);
        setPendingApplicationsCount(applicationsWithCreators.length);
      } else {
        setPendingApplications([]);
        setPendingApplicationsCount(0);
      }
    } catch (error) {
      console.error('Error loading pending applications:', error);
    }
  }

  function applyFilters() {
    let filtered = [...projects];

    // Search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
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

    // Deadline filter
    if (filters.maxDeadline < 30) {
      filtered = filtered.filter(p => p.deadline_days <= filters.maxDeadline);
    }

    // Sorting
    if (filters.sortBy === 'highest') {
      filtered.sort((a, b) => b.base_price - a.base_price);
    } else if (filters.sortBy === 'lowest') {
      filtered.sort((a, b) => a.base_price - b.base_price);
    } else {
      // Default: newest first
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      maxDeadline: 30,
      search: '',
      sortBy: 'newest',
    });
  }

  const hasActiveFilters =
    filters.videoType.length > 0 ||
    filters.editingStyle.length > 0 ||
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

  const displayedPendingApplications = showAllPendingApplications
    ? pendingApplications
    : pendingApplications.slice(0, 4);

  return (
    <DashboardLayout
      userType="editor"
      title="Dashboard"
      subtitle="Visão geral e projetos disponíveis"
    >
      <SubscriptionGuard>
        <div className="space-y-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ganhos Totais</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
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
                  Entregas com sucesso
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
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
                <div className="text-2xl font-bold">{pendingApplicationsCount}</div>
                <p className="text-xs text-muted-foreground">
                  Pendentes de resposta
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column: Projects in Progress, Pending Applications & Marketplace */}
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
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                {project.status === 'in_review' && '⏳ Aguardando revisão do Creator'}
                                {project.status === 'revision_requested' && '🔄 Correções solicitadas'}
                                {project.status === 'in_progress' && `Entrega em ${project.deadline_days} dias`}
                              </p>
                            </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        hasApplied={false}
                        canApply={
                          currentProjectsCount < (subscription?.subscription_plans.max_simultaneous_projects || 0)
                        }
                        hasSubscription={hasActiveSubscription()}
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

              {/* Candidaturas em Espera - NOVA SEÇÃO */}
              <section>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Candidaturas em Espera
                </h2>
                {pendingApplications.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      {displayedPendingApplications.map(application => (
                        <Card key={application.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={application.project.creator.profile_photo_url} />
                                  <AvatarFallback>
                                    {application.project.creator.full_name?.charAt(0) || 'C'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-foreground truncate">
                                    {application.project.title}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    por {application.project.creator.full_name}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      {application.project.video_type === 'reels' ? '📱' :
                                        application.project.video_type === 'motion' ? '🎨' : '📹'}
                                      {application.project.video_type}
                                    </span>
                                    <span>•</span>
                                    <span>R$ {application.project.base_price.toFixed(2)}</span>
                                    <span>•</span>
                                    <span>{application.project.deadline_days} dias</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Candidatura enviada em {new Date(application.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                Pendente
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Botão "Ver Mais" */}
                    {pendingApplications.length > 4 && !showAllPendingApplications && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setShowAllPendingApplications(true)}
                      >
                        Ver todas as {pendingApplications.length} candidaturas
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}

                    {/* Botão "Ver Menos" */}
                    {showAllPendingApplications && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        onClick={() => setShowAllPendingApplications(false)}
                      >
                        Ver menos
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-6 text-center border border-dashed">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium mb-1">Nenhuma candidatura pendente</p>
                    <p className="text-sm text-muted-foreground">
                      Candidate-se aos projetos abaixo para aparecer aqui
                    </p>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar Column: Messages */}
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
                          <div
                            key={msg.id}
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => navigate('/editor/messages')}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.sender?.profile_photo_url} />
                                <AvatarFallback>{msg.sender?.full_name?.charAt(0) || 'C'}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{msg.sender?.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(msg.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-1">Nenhuma mensagem recente</p>
                        <p className="text-xs">
                          Mensagens com creators aparecerão aqui
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </SubscriptionGuard>
    </DashboardLayout>
  );
}

export default EditorDashboard;
