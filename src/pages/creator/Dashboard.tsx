import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectCard } from '@/components/creator/ProjectCard';
import { useCreatorProjects } from '@/hooks/useCreatorProjects';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { projects, groupedProjects, loading, error, refresh } = useCreatorProjects();

  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  // Filtrar projetos por busca
  const filteredProjects = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    const filterBySearch = (projectList: typeof projects) =>
      projectList.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.editor_name?.toLowerCase().includes(searchLower)
      );

    if (activeFilter === 'all') {
      return filterBySearch(projects);
    }

    return filterBySearch(groupedProjects[activeFilter] || []);
  }, [projects, groupedProjects, searchTerm, activeFilter]);

  // Contadores para os filtros
  const counts = {
    all: projects.length,
    active: groupedProjects.active.length,
    pending: groupedProjects.pending.length,
    completed: groupedProjects.completed.length,
  };

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const batchProjects = projects.filter(p => p.is_batch);
    const totalVideos = batchProjects.reduce((acc, p) => acc + (p.batch_quantity || 0), 0);
    const approvedVideos = batchProjects.reduce((acc, p) => acc + (p.videos_approved || 0), 0);

    return {
      totalProjects: projects.length,
      batchProjects: batchProjects.length,
      totalVideos,
      approvedVideos,
    };
  }, [projects]);

  return (
    <DashboardLayout
      userType="creator"
      title="Meus Projetos"
      subtitle="Gerencie seus projetos de edição"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header com Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Projetos</h1>
            <p className="text-muted-foreground mt-1">
              {stats.totalProjects} projeto(s) • {stats.batchProjects} em lote • {stats.totalVideos} vídeos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              onClick={() => navigate('/creator/project/new')}
              className="bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Cards de Estatísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalProjects}</p>
                <p className="text-xs text-muted-foreground">Total de Projetos</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{counts.active}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalVideos}</p>
                <p className="text-xs text-muted-foreground">Vídeos em Lotes</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.approvedVideos}</p>
                <p className="text-xs text-muted-foreground">Vídeos Aprovados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Tabs de Filtro */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { key: 'all', label: 'Todos', count: counts.all },
              { key: 'active', label: 'Em Andamento', count: counts.active },
              { key: 'pending', label: 'Aguardando', count: counts.pending },
              { key: 'completed', label: 'Concluídos', count: counts.completed },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key as typeof activeFilter)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${activeFilter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeFilter === tab.key
                    ? 'bg-primary-foreground/20'
                    : 'bg-background'
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-64 pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Toggle de Visualização */}
          <div className="flex gap-1 border border-input rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
              title="Visualização em grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
                }`}
              title="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Estado de Erro */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Erro ao carregar projetos</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} className="ml-auto">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Estado de Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground mt-4">Carregando projetos...</p>
          </div>
        )}

        {/* Lista de Projetos */}
        {!loading && !error && (
          <>
            {filteredProjects.length > 0 ? (
              <div className={`grid gap-4 ${viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1'
                }`}>
                {filteredProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            ) : (
              /* Estado Vazio */
              <div className="text-center py-16 bg-muted/30 rounded-xl border-2 border-dashed border-muted">
                <div className="text-6xl mb-4">📽️</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {searchTerm
                    ? 'Nenhum projeto encontrado'
                    : 'Nenhum projeto ainda'
                  }
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchTerm
                    ? `Não encontramos projetos com "${searchTerm}". Tente outro termo.`
                    : 'Crie seu primeiro projeto para começar a trabalhar com editores profissionais.'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => navigate('/creator/project/new')}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Criar Primeiro Projeto
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
