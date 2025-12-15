import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Calendar, Eye, Archive, ArchiveRestore } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    revision_count?: number;
    is_archived?: boolean;
}

interface ProjectKanbanCardProps {
    project: Project;
    columnColor?: string;
    onArchive?: (id: string) => void;
    onUnarchive?: (id: string) => void;
}

function ProjectKanbanCard({ project, columnColor = '#3B82F6', onArchive, onUnarchive }: ProjectKanbanCardProps) {
    const navigate = useNavigate();

    // Formatação de data - COMPACTA
    const createdDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    const isCompleted = project.status === 'completed';
    const isArchived = project.is_archived;

    return (
        <Card
            className="hover:shadow-md transition-all cursor-pointer group border-2"
            onClick={() => navigate(`/editor/project/${project.id}`)}
        >
            <CardContent className="p-3 space-y-2">
                {/* Header com título e badge de versão */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-xs lg:text-sm text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                        {project.title}
                    </h3>
                    {project.revision_count && project.revision_count > 1 && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] font-bold shrink-0 px-1.5 py-0"
                            style={{
                                backgroundColor: `${columnColor}20`,
                                color: columnColor,
                                borderColor: `${columnColor}40`
                            }}
                        >
                            v{project.revision_count}
                        </Badge>
                    )}
                </div>

                {/* Informações do projeto - COMPACTAS */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-foreground text-xs">
                            R$ {project.base_price.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="text-xs">{project.deadline_days}d</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span className="text-xs">{createdDate}</span>
                    </div>
                </div>

                {/* Botões de ação - COMPACTO */}
                <div className="flex items-center gap-2 mt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs font-medium h-7"
                        style={{
                            borderColor: columnColor,
                            color: columnColor
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/editor/project/${project.id}`);
                        }}
                    >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                    </Button>

                    {/* Botão de Arquivar (apenas concluídos) */}
                    {isCompleted && !isArchived && onArchive && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                            title="Arquivar projeto"
                            onClick={(e) => {
                                e.stopPropagation();
                                onArchive(project.id);
                            }}
                        >
                            <Archive className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    {/* Botão de Restaurar (apenas arquivados) */}
                    {isArchived && onUnarchive && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-orange-500 hover:text-orange-600 hover:bg-orange-50 border-orange-200"
                            title="Desarquivar projeto"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnarchive(project.id);
                            }}
                        >
                            <ArchiveRestore className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default ProjectKanbanCard;
