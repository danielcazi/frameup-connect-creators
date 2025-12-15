import { Calendar, User, Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Project, getStatusConfig, ProjectStatus } from '@/utils/projectHelpers';
import { getDeadlineInfo } from '@/utils/dateHelpers';
import { cn } from '@/lib/utils';
import React from 'react';

interface ProjectGridCardProps {
    project: Project;
    onClick: () => void;
}

export function ProjectGridCard({ project, onClick }: ProjectGridCardProps) {
    const statusConfig = getStatusConfig(project.status as ProjectStatus);
    const deadlineInfo = project.deadline_at ? getDeadlineInfo(project.deadline_at) : null;

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-card border border-border rounded-xl p-4 cursor-pointer transition-all",
                "hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5",
                // Destaque para lotes
                project.is_batch && "border-l-4 border-l-violet-500"
            )}
        >
            {/* Header: Avatar + Creator Info */}
            {project.editor_name && (
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                            {project.editor_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Editor</p>
                    </div>
                </div>
            )}

            {/* Título */}
            <h4 className="font-semibold text-sm text-foreground mb-2 line-clamp-2">
                {project.title}
            </h4>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {/* Badge de Lote */}
                {project.is_batch && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200">
                        <Package className="w-2.5 h-2.5 mr-1" />
                        {project.batch_quantity} vídeos
                    </Badge>
                )}

                {/* Tipo e Estilo */}
                {project.video_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {project.video_type}
                    </Badge>
                )}
                {project.editing_style && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {project.editing_style}
                    </Badge>
                )}
            </div>

            {/* Info: Prazo e Valor */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                {deadlineInfo && (
                    <span className={cn(
                        "flex items-center gap-1",
                        deadlineInfo.color === 'red' && "text-red-600 dark:text-red-400",
                        deadlineInfo.color === 'orange' && "text-orange-600 dark:text-orange-400"
                    )}>
                        <Calendar className="w-3 h-3" />
                        {deadlineInfo.text}
                    </span>
                )}

                <span className="font-semibold text-foreground">
                    R$ {project.base_price?.toFixed(2).replace('.', ',')}
                </span>
            </div>

            {/* Footer: Status */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <Badge
                    variant="outline"
                    className={cn("text-[10px]", statusConfig.bgColor, statusConfig.textColor, statusConfig.borderColor)}
                >
                    {statusConfig.icon} {statusConfig.label}
                </Badge>

                <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
        </div>
    );
}
