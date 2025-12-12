import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  PlayCircle,
  MessageSquare,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Project, BatchVideo } from '@/hooks/useCreatorProjects';

// =====================================================
// CONFIGURAÇÃO DE STATUS
// =====================================================
const statusConfig = {
  draft: {
    label: 'Rascunho',
    color: 'border-gray-300 bg-gray-50',
    icon: Clock,
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  },
  pending: {
    label: 'Aguardando',
    color: 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20',
    icon: Clock,
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400'
  },
  published: {
    label: 'Publicado',
    color: 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20',
    icon: Package,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
  },
  in_progress: {
    label: 'Em Andamento',
    color: 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20',
    icon: PlayCircle,
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'
  },
  delivered: {
    label: 'Entregue',
    color: 'border-purple-400 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20',
    icon: Package,
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400'
  },
  revision: {
    label: 'Em Revisão',
    color: 'border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-900/20',
    icon: AlertCircle,
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400'
  },
  approved: {
    label: 'Aprovado',
    color: 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20',
    icon: CheckCircle2,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
  },
  completed: {
    label: 'Concluído',
    color: 'border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20',
    icon: CheckCircle2,
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
  }
};

// Ícones de status para vídeos individuais
const videoStatusIcons: Record<string, string> = {
  pending: '⏳',
  in_progress: '🎬',
  delivered: '📦',
  revision: '🔄',
  approved: '✅'
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
interface ProjectCardProps {
  project: Project;
  viewMode?: 'grid' | 'list';
}

export function ProjectCard({ project, viewMode = 'grid' }: ProjectCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Calcular status para projetos em lote
  const getDisplayStatus = (): string => {
    if (!project.is_batch || !project.batch_videos || project.batch_videos.length === 0) {
      return project.status;
    }

    const videos = project.batch_videos;
    const allApproved = videos.every(v => v.status === 'approved');
    if (allApproved) return 'completed';

    const hasDelivered = videos.some(v => v.status === 'delivered');
    if (hasDelivered) return 'delivered';

    const hasRevision = videos.some(v => v.status === 'revision');
    if (hasRevision) return 'revision';

    const hasInProgress = videos.some(v => v.status === 'in_progress');
    if (hasInProgress) return 'in_progress';

    return project.status;
  };

  const displayStatus = getDisplayStatus();
  const config = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  // Calcular progresso do lote
  const batchProgress = project.is_batch && project.batch_videos
    ? {
      approved: project.batch_videos.filter(v => v.status === 'approved').length,
      total: project.batch_videos.length,
      percentage: (project.batch_videos.filter(v => v.status === 'approved').length / project.batch_videos.length) * 100
    }
    : null;

  return (
    <div
      className={`border-2 rounded-xl transition-all hover:shadow-lg ${config.color} ${viewMode === 'list' ? 'flex flex-col md:flex-row md:items-center' : ''
        }`}
    >
      {/* Header do Card */}
      <div className={`p-5 ${viewMode === 'list' ? 'flex-1' : ''}`}>
        {/* Título e Badge de Lote */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-lg text-foreground truncate">
                {project.title}
              </h3>
              {project.is_batch && (
                <span className="shrink-0 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Lote ({project.batch_quantity})
                </span>
              )}
            </div>

            {/* Editor atribuído */}
            {project.editor_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Editor: <span className="font-medium text-foreground">{project.editor_name}</span>
              </p>
            )}
          </div>

          {/* Badge de Status */}
          <div className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${config.badge}`}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </div>
        </div>

        {/* Informações do Projeto */}
        <div className="space-y-2 mb-4">
          {/* Valor */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">💰 Valor Total</span>
            <span className="font-semibold text-foreground">
              R$ {(project.base_price * (project.batch_quantity || 1)).toFixed(2)}
              {project.is_batch && project.batch_discount_percent && project.batch_discount_percent > 0 && (
                <span className="ml-1 text-xs text-green-600">
                  (-{project.batch_discount_percent}%)
                </span>
              )}
            </span>
          </div>

          {/* Progresso do Lote */}
          {project.is_batch && batchProgress && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">📊 Progresso</span>
                <span className="font-semibold text-foreground">
                  {batchProgress.approved}/{batchProgress.total} vídeos aprovados
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${batchProgress.percentage}%` }}
                />
              </div>

              {/* Modo de Entrega */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">📅 Modo</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                  {project.batch_delivery_mode === 'simultaneous' ? '⚡ Simultâneo' : '📅 Sequencial'}
                </span>
              </div>
            </>
          )}

          {/* Prazo */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Prazo
            </span>
            <span className="text-foreground">
              {project.deadline
                ? formatDistanceToNow(new Date(project.deadline), {
                  addSuffix: true,
                  locale: ptBR
                })
                : 'Não definido'
              }
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/creator/project/${project.id}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            <Eye className="w-4 h-4" />
            Ver Detalhes
          </button>

          {/* Botão de Chat (se tem editor) */}
          {project.assigned_editor_id && (
            <button
              onClick={() => navigate(`/creator/project/${project.id}/chat`)}
              className="px-4 py-2.5 border-2 border-primary text-primary hover:bg-primary/10 rounded-lg font-medium transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}

          {/* Botão de Expandir (se for lote) */}
          {project.is_batch && project.batch_videos && project.batch_videos.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-4 py-2.5 border-2 border-border hover:bg-muted rounded-lg font-medium transition-colors"
              title={expanded ? 'Recolher' : 'Expandir vídeos'}
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Lista Expandida de Vídeos (Somente para Lote) */}
      {project.is_batch && expanded && project.batch_videos && project.batch_videos.length > 0 && (
        <div className="border-t-2 border-border/50 bg-background/50">
          <div className="p-5 space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              📋 Vídeos do Lote ({project.batch_videos.length})
            </h4>

            {project.batch_videos.map((video) => {
              const videoConfig = statusConfig[video.status as keyof typeof statusConfig] || statusConfig.pending;

              return (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/creator/project/${project.id}/video/${video.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Número do vídeo */}
                    <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {video.sequence_order}
                    </div>

                    <div className="min-w-0">
                      <div className="font-medium text-sm text-foreground truncate">
                        {video.title || `Vídeo #${video.sequence_order}`}
                      </div>

                      {/* Revisões */}
                      {video.revision_count > 0 && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                          🔄 {video.revision_count} revisão(ões)
                        </div>
                      )}

                      {/* Data de aprovação */}
                      {video.approved_at && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                          ✅ Aprovado em {format(new Date(video.approved_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status do vídeo */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl">
                      {videoStatusIcons[video.status] || '⏳'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${videoConfig.badge}`}>
                      {videoConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Resumo financeiro do lote */}
            {project.editor_earnings_released !== undefined && project.editor_earnings_released > 0 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 dark:text-green-400">💸 Pagamentos liberados</span>
                  <span className="font-bold text-green-700 dark:text-green-400">
                    R$ {project.editor_earnings_released.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
