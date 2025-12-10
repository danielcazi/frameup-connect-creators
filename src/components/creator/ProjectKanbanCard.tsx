import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    DollarSign,
    Users,
    Eye,
    MessageSquare,
    PlayCircle,
    AlertCircle,
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

interface ProjectKanbanCardProps {
    project: Project;
}

function ProjectKanbanCard({ project }: ProjectKanbanCardProps) {
    const navigate = useNavigate();
    const applicationCount = project._count?.applications || 0;
    const hasApplications = applicationCount > 0;

    function getMainAction() {
        switch (project.status) {
            case 'draft':
                return {
                    label: 'Publicar',
                    onClick: () => navigate(`/creator/project/${project.id}/payment`),
                    variant: 'default' as const,
                };
            case 'open':
                if (hasApplications) {
                    return {
                        label: `Ver Candidaturas (${applicationCount})`,
                        onClick: () => navigate(`/creator/project/${project.id}/applications`),
                        variant: 'default' as const,
                        icon: Users,
                    };
                }
                return {
                    label: 'Ver Detalhes',
                    onClick: () => navigate(`/creator/project/${project.id}`),
                    variant: 'secondary' as const,
                    icon: Eye,
                };
            case 'in_progress':
                return {
                    label: 'Abrir Chat',
                    onClick: () => navigate(`/creator/project/${project.id}/chat`),
                    variant: 'default' as const,
                    icon: MessageSquare,
                };
            case 'in_review':
            case 'revision_requested':
                return {
                    label: project.status === 'in_review' ? 'Revisar Entrega' : 'Ver Revisão',
                    onClick: () => navigate(`/creator/project/${project.id}/review`),
                    variant: 'default' as const,
                    icon: PlayCircle,
                };
            case 'completed':
                return {
                    label: project.has_reviewed ? 'Ver Detalhes' : 'Avaliar Editor',
                    onClick: () => navigate(project.has_reviewed
                        ? `/creator/project/${project.id}`
                        : `/creator/project/${project.id}/rate`),
                    variant: project.has_reviewed ? 'secondary' as const : 'default' as const,
                    icon: Eye,
                };
            default:
                return {
                    label: 'Ver Detalhes',
                    onClick: () => navigate(`/creator/project/${project.id}`),
                    variant: 'secondary' as const,
                    icon: Eye,
                };
        }
    }

    const action = getMainAction();
    const ActionIcon = action.icon;

    return (
        <Card className="p-4 hover:shadow-md transition-all cursor-pointer group bg-white dark:bg-gray-900">
            {/* Título */}
            <h4
                className="font-semibold text-sm text-foreground line-clamp-2 mb-3 group-hover:text-primary transition-colors"
                onClick={() => navigate(`/creator/project/${project.id}`)}
            >
                {project.title}
            </h4>

            {/* Info compacta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>R$ {project.base_price.toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{project.deadline_days}d</span>
                </div>
                {applicationCount > 0 && (
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{applicationCount}</span>
                    </div>
                )}
            </div>

            {/* Alerta de candidaturas */}
            {hasApplications && project.status === 'open' && (
                <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 mb-3 bg-yellow-50 dark:bg-yellow-900/20 rounded px-2 py-1">
                    <AlertCircle className="w-3 h-3" />
                    <span className="font-medium">{applicationCount} candidatura{applicationCount !== 1 ? 's' : ''}</span>
                </div>
            )}

            {/* Avaliação pendente */}
            {project.status === 'completed' && !project.has_reviewed && (
                <Badge
                    variant="outline"
                    className="mb-3 text-xs border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                >
                    Avaliar Pendente
                </Badge>
            )}

            {/* Ação principal */}
            <Button
                size="sm"
                variant={action.variant}
                className="w-full text-xs h-8"
                onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                }}
            >
                {ActionIcon && <ActionIcon className="w-3 h-3 mr-1.5" />}
                {action.label}
            </Button>
        </Card>
    );
}

export default ProjectKanbanCard;
