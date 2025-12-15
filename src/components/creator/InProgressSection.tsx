// src/components/creator/InProgressSection.tsx
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project, getStatusConfig } from '@/utils/projectHelpers';
import { cn } from '@/lib/utils';

interface InProgressSectionProps {
    projects: Project[];
    maxItems?: number;
    onProjectClick?: (projectId: string) => void;
}

export function InProgressSection({
    projects,
    maxItems = 3,
    onProjectClick
}: InProgressSectionProps) {
    const navigate = useNavigate();

    // Filtrar apenas projetos em andamento ou aguardando revisão
    const activeProjects = projects
        .filter(p => ['in_progress', 'assigned', 'in_review'].includes(p.status))
        .slice(0, maxItems);

    const handleProjectClick = (project: Project) => {
        if (onProjectClick) {
            onProjectClick(project.id);
        } else {
            navigate(`/creator/project/${project.id}`);
        }
    };

    const getActionButton = (project: Project) => {
        if (project.status === 'in_review') {
            return (
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/creator/project/${project.id}?tab=review`);
                    }}
                >
                    <Eye className="w-3 h-3 mr-1" />
                    Revisar
                </Button>
            );
        }

        return (
            <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/creator/project/${project.id}`);
                }}
            >
                Ver
                <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
        );
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-foreground">Em Andamento</h3>
                {activeProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                        {activeProjects.length}
                    </Badge>
                )}
            </div>

            {/* Conteúdo */}
            <div className="p-4">
                {activeProjects.length > 0 ? (
                    <div className="space-y-3">
                        {activeProjects.map((project) => {
                            const statusConfig = getStatusConfig(project.status);

                            return (
                                <div
                                    key={project.id}
                                    onClick={() => handleProjectClick(project)}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg cursor-pointer",
                                        "bg-muted/30 hover:bg-muted/50 transition-colors",
                                        "border border-transparent hover:border-border"
                                    )}
                                >
                                    {/* Info do Projeto */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Badge de Lote ou Ícone */}
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                            project.is_batch
                                                ? "bg-violet-100 dark:bg-violet-900/30"
                                                : "bg-blue-100 dark:bg-blue-900/30"
                                        )}>
                                            {project.is_batch ? (
                                                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                    {project.batch_quantity}
                                                </span>
                                            ) : (
                                                <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            )}
                                        </div>

                                        {/* Título e Status */}
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">
                                                {project.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={cn(
                                                    "text-xs font-medium",
                                                    statusConfig.textColor
                                                )}>
                                                    {statusConfig.icon} {statusConfig.label}
                                                </span>
                                                {project.editor_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        • {project.editor_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botão de Ação */}
                                    {getActionButton(project)}
                                </div>
                            );
                        })}

                        {/* Link Ver Todos */}
                        {projects.filter(p => ['in_progress', 'assigned', 'in_review'].includes(p.status)).length > maxItems && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/creator/projects?filter=active')}
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                            >
                                Ver todos os projetos ativos
                                <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                        )}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-8">
                        <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            Nenhum projeto em andamento no momento.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InProgressSection;
