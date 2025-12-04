import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MetricCard from '@/components/creator/MetricCard';
import ProjectCard from '@/components/creator/ProjectCard';
import EmptyState from '@/components/common/EmptyState';
import { useToast } from '@/hooks/use-toast';

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

interface Metrics {
  activeProjects: number;
  completedProjects: number;
  awaitingReview: number;
}

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    activeProjects: 0,
    completedProjects: 0,
    awaitingReview: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, statusFilter, sortBy]);

  const fetchProjects = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          assigned_editor:users!assigned_editor_id(
            full_name,
            username,
            profile_photo_url
          )
        `)
        .eq('creator_id', user.id);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: sortBy === 'oldest' });

      const { data, error } = await query;

      if (error) throw error;

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

      // Transform projects to include _count and has_reviewed
      const projectsWithCounts = data?.map(project => ({
        ...project,
        _count: {
          applications: applicationCounts[project.id] || 0
        },
        has_reviewed: reviewedProjectIds.has(project.id)
      })) || [];

      setProjects(projectsWithCounts);

      // Calculate metrics
      setMetrics({
        activeProjects: projectsWithCounts.filter(p => p.status === 'in_progress').length,
        completedProjects: projectsWithCounts.filter(p => p.status === 'completed').length,
        awaitingReview: projectsWithCounts.filter(p => p.status === 'in_review').length,
      });
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
      subtitle="Gerencie seus projetos de edição de vídeo"
      headerAction={
        <Button onClick={handleNewProject}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Projeto
        </Button>
      }
    >
      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Projetos Ativos"
          value={metrics.activeProjects}
          icon={<FolderOpen />}
          color="blue"
          subtitle="Em andamento"
        />

        <MetricCard
          title="Projetos Concluídos"
          value={metrics.completedProjects}
          icon={<CheckCircle />}
          color="green"
          subtitle="Finalizados"
        />

        <MetricCard
          title="Aguardando Revisão"
          value={metrics.awaitingReview}
          icon={<Clock />}
          color="yellow"
          subtitle="Pendente aprovação"
        />
      </div>

      {/* Projects List Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-foreground">Todos os Projetos</h2>

        <div className="flex gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Aguardando Editor</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="in_review">Em Revisão</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[150px]">
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
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto e encontre o editor perfeito para seu conteúdo."
            action={{
              label: "Criar Primeiro Projeto",
              onClick: handleNewProject,
              variant: "default",
            }}
          />
        )}

        {!loading && projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default CreatorDashboard;
