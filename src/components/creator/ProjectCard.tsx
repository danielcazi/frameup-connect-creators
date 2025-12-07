import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { canEditProject, getProjectStatusLabel } from '@/lib/projects';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Calendar,
  DollarSign,
  Users,
  Eye,
  MessageSquare,
  AlertCircle,
  PlayCircle,
  Edit,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  status: string;
  base_price: number;
  deadline_days: number;
  created_at: string;
  _count?: {
    applications: number;
  };
  has_reviewed?: boolean;
  assigned_editor_id?: string;
}

function CreatorProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();

  const applicationCount = project._count?.applications || 0;
  const hasApplications = applicationCount > 0;

  function getStatusBadge(project: Project) {
    const statusLabel = getProjectStatusLabel(project);
    const status = project.status;
    const hasEditor = !!project.assigned_editor_id;

    // Custom styles based on the *computed* status or raw status
    if (status === 'draft') return <Badge variant="secondary">{statusLabel}</Badge>;
    if (status === 'open' || (status === 'published' && !hasEditor)) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{statusLabel}</Badge>;
    if (status === 'in_progress' || (status === 'published' && hasEditor)) return <Badge variant="default">{statusLabel}</Badge>;
    if (status === 'in_review') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">{statusLabel}</Badge>;
    if (status === 'completed') return <Badge className="bg-green-500 hover:bg-green-600 text-white">{statusLabel}</Badge>;
    if (status === 'cancelled') return <Badge variant="destructive">{statusLabel}</Badge>;

    return <Badge variant="secondary">{statusLabel}</Badge>;
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground line-clamp-2">
          {project.title}
        </h3>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge(project)}
          {project.status === 'completed' && !project.has_reviewed && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700 text-xs whitespace-nowrap">
              Avaliar Pendente
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span>R$ {project.base_price.toFixed(2).replace('.', ',')}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{project.deadline_days} dias de prazo</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {applicationCount} candidatura{applicationCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Applications Alert */}
      {hasApplications && project.status === 'open' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-medium">Você tem {applicationCount} candidatura{applicationCount !== 1 ? 's' : ''}!</p>
            <p>Analise os perfis e selecione um editor</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {project.status === 'draft' ? (
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => navigate(`/creator/project/${project.id}/edit`)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate(`/creator/project/${project.id}/payment`)}
            >
              Publicar
            </Button>
          </>
        ) : project.status === 'open' && hasApplications ? (
          <Button
            className="w-full"
            onClick={() => navigate(`/creator/project/${project.id}/applications`)}
          >
            <Users className="w-4 h-4 mr-2" />
            Ver Candidaturas ({applicationCount})
          </Button>
        ) : project.status === 'in_progress' ? (
          <Button
            className="w-full"
            onClick={() => navigate(`/creator/project/${project.id}/chat`)}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Abrir Chat
          </Button>
        ) : ['in_review', 'revision_requested'].includes(project.status) ? (
          <Button
            className="w-full"
            onClick={() => navigate(`/creator/project/${project.id}/review`)}
            variant={project.status === 'in_review' ? 'default' : 'secondary'}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            {project.status === 'in_review' ? 'Revisar Entrega' : 'Ver Revisão'}
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate(`/creator/project/${project.id}`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes
          </Button>
        )}

        {/* Edit Button - only if draft/open/published AND no editor assigned */}
        {canEditProject(project) && project.status !== 'draft' && (
          <Button
            variant="outline"
            className="w-full" // ou w-auto dependendo do layout desejado, mas aqui parece coluna única ou flex row
            onClick={() => navigate(`/creator/project/${project.id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </div>
    </Card>
  );
}

export default CreatorProjectCard;
