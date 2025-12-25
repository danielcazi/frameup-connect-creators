import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import ProjectKanbanCard from './ProjectKanbanCard';
import { FileText, Clock, Play, CheckCircle, XCircle, Search } from 'lucide-react';
import { Project, calculateBatchAggregatedStatus } from '@/utils/projectHelpers';

interface ProjectKanbanProps {
    projects: Project[];
    onArchive?: (projectId: string) => void;
    onUnarchive?: (projectId: string) => void;
    isArchivedView?: boolean;
    onOpenBatch?: (projectId: string) => void;
}

// Definição das colunas do Kanban
const KANBAN_COLUMNS = [
    {
        id: 'draft',
        name: 'Rascunho',
        color: '#6B7280',
        bgColor: 'bg-gray-50 dark:bg-gray-900/50',
        borderColor: 'border-gray-200 dark:border-gray-700',
        icon: FileText,
    },
    {
        id: 'open',
        name: 'Aguardando Editor',
        color: '#F59E0B',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
        icon: Search,
    },
    {
        id: 'in_progress',
        name: 'Em Andamento',
        color: '#3B82F6',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Play,
    },
    {
        id: 'in_review',
        name: 'Em Revisão',
        color: '#8B5CF6',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: Clock,
    },
    {
        id: 'completed',
        name: 'Concluídos',
        color: '#22C55E',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
    },
    {
        id: 'cancelled',
        name: 'Cancelados',
        color: '#EF4444',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: XCircle,
    },
    {
        id: 'archived',
        name: 'Arquivados',
        color: '#9CA3AF',
        bgColor: 'bg-gray-100 dark:bg-gray-800/50',
        borderColor: 'border-gray-300 dark:border-gray-700',
        icon: FileText,
    },
];

function ProjectKanban({
    projects,
    onArchive,
    onUnarchive,
    isArchivedView = false,
    onOpenBatch
}: ProjectKanbanProps) {

    // Função auxiliar para mapear status
    const getKanbanStatus = (status: string) => {
        switch (status) {
            case 'revision_requested':
                return 'in_progress';
            case 'pending_approval':
                return 'in_review';
            default:
                return status;
        }
    };

    // Processar projetos: calcular status agregado para lotes
    const processedProjects = useMemo(() => {
        return projects.map(project => {
            // Se já estiver arquivado, manter status
            if (project.status === 'archived') {
                return project;
            }

            // Se for lote com vídeos, calcular status agregado
            if (project.is_batch && project.batch_videos && project.batch_videos.length > 0) {
                const aggregatedStatus = calculateBatchAggregatedStatus(project.batch_videos);
                return { ...project, status: aggregatedStatus };
            }
            return project;
        });
    }, [projects]);

    // Agrupar projetos por status
    const projectsByStatus = useMemo(() => {
        const grouped: Record<string, Project[]> = {};

        KANBAN_COLUMNS.forEach(col => {
            grouped[col.id] = [];
        });

        processedProjects.forEach(project => {
            const mappedStatus = getKanbanStatus(project.status);
            if (grouped[mappedStatus]) {
                grouped[mappedStatus].push(project);
            } else {
                grouped['draft'].push(project);
            }
        });

        return grouped;
    }, [processedProjects]);

    // Filtrar colunas visíveis
    const visibleColumns = useMemo(() => {
        if (isArchivedView) {
            return KANBAN_COLUMNS.filter(col => col.id === 'archived');
        }

        return KANBAN_COLUMNS.filter(col => {
            // Sempre mostrar colunas principais do workflow
            if (['open', 'in_progress', 'in_review', 'completed'].includes(col.id)) {
                return true;
            }
            // Mostrar draft apenas se tiver projetos
            if (col.id === 'draft' && projectsByStatus['draft']?.length > 0) {
                return true;
            }
            // Não mostrar archived na view normal
            if (col.id === 'archived') {
                return false;
            }
            // Mostrar outras colunas se tiverem projetos
            return projectsByStatus[col.id]?.length > 0;
        });
    }, [projectsByStatus, isArchivedView]);

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
                {visibleColumns.map(column => {
                    const columnProjects = projectsByStatus[column.id] || [];
                    const Icon = column.icon;

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                'flex flex-col w-72 min-h-[500px] rounded-lg border-2',
                                column.bgColor,
                                column.borderColor
                            )}
                        >
                            {/* Header da coluna */}
                            <div className="flex items-center gap-2 p-3 border-b border-inherit">
                                <div
                                    className="flex items-center justify-center w-6 h-6 rounded"
                                    style={{ backgroundColor: `${column.color}20` }}
                                >
                                    <Icon
                                        className="w-4 h-4"
                                        style={{ color: column.color }}
                                    />
                                </div>
                                <span className="font-semibold text-sm text-foreground">
                                    {column.name}
                                </span>
                                <span
                                    className="ml-auto flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
                                    style={{ backgroundColor: column.color }}
                                >
                                    {columnProjects.length}
                                </span>
                            </div>

                            {/* Cards da coluna */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                                {columnProjects.length === 0 ? (
                                    <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                                        Nenhum projeto
                                    </div>
                                ) : (
                                    columnProjects.map(project => (
                                        <ProjectKanbanCard
                                            key={project.id}
                                            project={project}
                                            columnColor={column.color}
                                            onArchive={onArchive}
                                            onUnarchive={onUnarchive}
                                            onOpenBatch={onOpenBatch}
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
