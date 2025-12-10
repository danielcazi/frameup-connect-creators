import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import ProjectKanbanCard from './ProjectKanbanCard';
import { Play, Clock, CheckCircle, AlertTriangle, FileCheck } from 'lucide-react';

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    revision_count?: number;
    _count?: {
        applications: number;
    };
}

interface ProjectKanbanProps {
    projects: Project[];
}

// Definição das colunas do Kanban
const KANBAN_COLUMNS = [
    {
        id: 'in_progress',
        name: 'Em Andamento',
        description: 'Editor trabalhando',
        color: '#3B82F6', // blue-500
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Play,
    },
    {
        id: 'in_review',
        name: 'Em Revisão',
        description: 'Aguardando creator',
        color: '#EF4444', // red-500
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: Clock,
    },
    {
        id: 'revision_requested',
        name: 'Correções',
        description: 'Ajustes solicitados',
        color: '#A855F7', // purple-500
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: AlertTriangle,
    },
    {
        id: 'pending_approval',
        name: 'Aguardando',
        description: 'Análise do creator',
        color: '#F59E0B', // amber-500
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: FileCheck,
    },
    {
        id: 'completed',
        name: 'Concluídos',
        description: 'Finalizados',
        color: '#22C55E', // green-500
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
    },
];

function ProjectKanban({ projects }: ProjectKanbanProps) {
    // Agrupar projetos por status
    const projectsByStatus = useMemo(() => {
        const grouped: Record<string, Project[]> = {};

        // Inicializar todas as colunas
        KANBAN_COLUMNS.forEach(col => {
            grouped[col.id] = [];
        });

        // Distribuir projetos
        projects.forEach(project => {
            const status = project.status;
            if (grouped[status]) {
                grouped[status].push(project);
            } else {
                // Fallback para status não reconhecidos
                if (status === 'cancelled') {
                    return;
                }
                if (grouped['in_progress']) {
                    grouped['in_progress'].push(project);
                }
            }
        });

        return grouped;
    }, [projects]);

    // Filtrar apenas colunas relevantes para o workflow ativo
    const visibleColumns = useMemo(() => {
        return KANBAN_COLUMNS.filter(col =>
            ['in_progress', 'in_review', 'revision_requested', 'pending_approval', 'completed'].includes(col.id)
        );
    }, []);

    return (
        <div className="w-full h-full">
            {/* Grid responsivo - 5 colunas em telas grandes, menos em telas menores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
                {visibleColumns.map(column => {
                    const columnProjects = projectsByStatus[column.id] || [];
                    const Icon = column.icon;

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                'flex flex-col min-h-[400px] lg:min-h-[500px] rounded-lg border-2 shadow-sm',
                                column.bgColor,
                                column.borderColor
                            )}
                        >
                            {/* Header da coluna - COMPACTO */}
                            <div className="flex flex-col gap-1 p-3 border-b border-inherit">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                                        style={{ backgroundColor: `${column.color}20` }}
                                    >
                                        <Icon
                                            className="w-4 h-4"
                                            style={{ color: column.color }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-xs lg:text-sm text-foreground truncate">
                                                {column.name}
                                            </span>
                                            <span
                                                className="flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: column.color }}
                                            >
                                                {columnProjects.length}
                                            </span>
                                        </div>
                                        <p className="text-[10px] lg:text-xs text-muted-foreground truncate">
                                            {column.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards da coluna - SCROLLÁVEL */}
                            <div className="flex-1 p-2 lg:p-3 space-y-2 lg:space-y-3 overflow-y-auto">
                                {columnProjects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 lg:h-32 text-center p-3">
                                        <Icon
                                            className="w-6 h-6 lg:w-8 lg:h-8 mb-2 opacity-30"
                                            style={{ color: column.color }}
                                        />
                                        <p className="text-xs lg:text-sm text-muted-foreground font-medium">
                                            Nenhum projeto
                                        </p>
                                    </div>
                                ) : (
                                    columnProjects.map(project => (
                                        <ProjectKanbanCard
                                            key={project.id}
                                            project={project}
                                            columnColor={column.color}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ProjectKanban;
