import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Eye,
    Layers,
    Archive,
    ArchiveRestore,
    MessageSquare,
    PlayCircle,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Project } from '@/utils/projectHelpers';

interface ProjectKanbanCardProps {
    project: Project;
    columnColor?: string;
    onArchive?: (projectId: string) => void;
    onUnarchive?: (projectId: string) => void;
}

const ProjectKanbanCard = ({ project, onArchive, onUnarchive }: ProjectKanbanCardProps) => {
    const navigate = useNavigate();
    const applicationCount = project._count?.applications || 0;
    const hasApplications = applicationCount > 0;

    const getDeadlineColor = (days: number) => {
        if (days < 0) return 'text-red-500 font-medium';
        if (days <= 2) return 'text-orange-500 font-medium';
        return 'text-gray-500';
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

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
            case 'revision_requested': // Legacy/Fallback
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

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2" title={project.title}>
                    {project.title}
                </h3>
            </div>

            {/* Price and Deadline */}
            <div className="flex items-center gap-4 text-xs mb-4">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                    {formatCurrency(project.base_price)}
                </span>
                <span className={`flex items-center gap-1 ${getDeadlineColor(project.deadline_days)}`}>
                    <Calendar className="w-3 h-3" />
                    {project.deadline_days < 0
                        ? `${Math.abs(project.deadline_days)}d atrasado`
                        : `${project.deadline_days}d`
                    }
                </span>
                {project.batch_quantity && project.batch_quantity > 1 && (
                    <span className="text-gray-500 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {project.batch_quantity}
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 border-0"
                    onClick={() => navigate(`/creator/project/${project.id}`)}
                >
                    <Eye className="w-3 h-3 mr-1.5" />
                    Ver Detalhes
                </Button>

                {/* Archive/Unarchive Action */}
                {project.is_archived && onUnarchive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-green-600 hover:bg-green-50"
                        title="Desarquivar projeto"
                        onClick={(e) => {
                            e.stopPropagation();
                            onUnarchive(project.id);
                        }}
                    >
                        <ArchiveRestore className="w-4 h-4" />
                    </Button>
                )}

                {!project.is_archived && project.status === 'completed' && onArchive && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Arquivar projeto"
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive(project.id);
                        }}
                    >
                        <Archive className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ProjectKanbanCard;
