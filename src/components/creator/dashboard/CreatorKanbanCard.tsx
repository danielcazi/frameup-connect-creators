import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    Calendar,
    DollarSign,
    Users,
    MessageSquare,
    PlayCircle,
    Eye,
    Package,
    MoreHorizontal
} from 'lucide-react';
import { Project } from '@/hooks/useCreatorProjects';

interface CreatorKanbanCardProps {
    project: Project;
}

export default function CreatorKanbanCard({ project }: CreatorKanbanCardProps) {
    const navigate = useNavigate();
    const applicationCount = project.assigned_editor_id ? 0 : (project._count?.applications || 0); // Only show applications if not assigned (though _count might be 0 anyway)
    // Actually typically we want to show applications count if status is open.

    const isBatch = project.is_batch;

    // Determine action based on status (simplified for compact view)
    const getMainAction = () => {
        switch (project.status) {
            case 'draft':
                return { label: 'Publicar', icon: PlayCircle, onClick: () => navigate(`/creator/project/${project.id}/payment`) };
            case 'open':
                return {
                    label: applicationCount > 0 ? 'Ver Candidatos' : 'Ver Detalhes',
                    icon: applicationCount > 0 ? Users : Eye,
                    onClick: () => navigate(applicationCount > 0 ? `/creator/project/${project.id}/applications` : `/creator/project/${project.id}`)
                };
            case 'in_progress':
                return { label: 'Chat', icon: MessageSquare, onClick: () => navigate(`/creator/project/${project.id}/chat`) };
            case 'in_review':
                return { label: 'Revisar', icon: PlayCircle, onClick: () => navigate(`/creator/project/${project.id}/review`) };
            case 'completed':
                if (!project.has_reviewed) {
                    return { label: 'Avaliar', icon: MessageSquare, onClick: () => navigate(`/creator/project/${project.id}/rate`) };
                }
                return { label: 'Ver', icon: Eye, onClick: () => navigate(`/creator/project/${project.id}`) };
            default:
                return { label: 'Ver', icon: Eye, onClick: () => navigate(`/creator/project/${project.id}`) };
        }
    };

    const action = getMainAction();
    const ActionIcon = action.icon;

    return (
        <Card
            className={cn(
                "p-3 hover:shadow-md transition-all cursor-pointer group bg-card",
                isBatch && "border-l-4 border-l-purple-500" // Highlight batch projects
            )}
            onClick={() => navigate(`/creator/project/${project.id}`)}
        >
            <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        {isBatch && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                <Package className="w-3 h-3 mr-1" />
                                Lote ({project.batch_quantity})
                            </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium truncate">
                            {project.video_type}
                        </span>
                    </div>
                    <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {project.title}
                    </h4>
                </div>

                {/* Visual indicator for Editor if assigned */}
                {project.editor_photo && (
                    <img
                        src={project.editor_photo}
                        alt="Editor"
                        className="w-6 h-6 rounded-full border border-border object-cover flex-shrink-0"
                        title={project.editor_name || 'Editor'}
                    />
                )}
            </div>

            <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1" title="Valor do Projeto">
                        <DollarSign className="w-3 h-3" />
                        <span>{project.base_price.toFixed(0)}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Prazo">
                        <Calendar className="w-3 h-3" />
                        <span>{project.deadline_days}d</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary"
                    onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                    }}
                >
                    {ActionIcon && <ActionIcon className="w-3 h-3 mr-1.5" />}
                    {action.label}
                </Button>
            </div>

            {/* Show application badge if Open and has applications */}
            {project.status === 'open' && applicationCount > 0 && (
                <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" />
                    {applicationCount} candidaturas
                </div>
            )}
        </Card>
    );
}
