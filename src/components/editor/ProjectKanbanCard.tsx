import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Calendar, Eye } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    revision_count?: number;
}

interface ProjectKanbanCardProps {
    project: Project;
    columnColor?: string;
}

function ProjectKanbanCard({ project, columnColor = '#3B82F6' }: ProjectKanbanCardProps) {
    const navigate = useNavigate();

    // Formatação de data - COMPACTA
    const createdDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

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

                {/* Botão de ação - COMPACTO */}
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs font-medium h-7"
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
            </CardContent>
        </Card>
    );
}

export default ProjectKanbanCard;
