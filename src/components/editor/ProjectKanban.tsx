import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import ProjectKanbanCard from './ProjectKanbanCard';
import { Play, Clock, CheckCircle, AlertTriangle, FileCheck, Archive } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title: string;
    status: string;
    revision_count?: number;
}

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    is_batch?: boolean;
    batch_quantity?: number;
    batch_videos?: BatchVideo[];
    revision_count?: number;
    users?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

interface ProjectKanbanProps {
    projects: Project[];
    isArchivedView?: boolean;
    onOpenBatch?: (projectId: string) => void;
    onArchive?: (projectId: string) => void;
    onUnarchive?: (projectId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINIÇÃO DAS COLUNAS DO KANBAN DO EDITOR
// ═══════════════════════════════════════════════════════════════════════════════

const KANBAN_COLUMNS = [
    {
        id: 'in_progress',
        name: 'Em Andamento',
        description: 'Você está trabalhando',
        color: '#3B82F6',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Play,
    },
    {
        id: 'in_review',
        name: 'Em Revisão',
        description: 'Aguardando creator',
        color: '#EF4444',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: Clock,
    },
    {
        id: 'revision_requested',
        name: 'Correções',
        description: 'Ajustes solicitados',
        color: '#A855F7',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: AlertTriangle,
    },
    {
        id: 'pending_approval',
        name: 'Aguardando',
        description: 'Análise do creator',
        color: '#F59E0B',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: FileCheck,
    },
    {
        id: 'completed',
        name: 'Concluídos',
        description: 'Finalizados',
        color: '#22C55E',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
    },
    {
        id: 'archived',
        name: 'Arquivados',
        description: 'Projetos arquivados',
        color: '#64748B',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        borderColor: 'border-slate-200 dark:border-slate-800',
        icon: Archive,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PARA CALCULAR STATUS AGREGADO DO LOTE
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBatchAggregatedStatus(batchVideos: BatchVideo[]): string {
    if (!batchVideos || batchVideos.length === 0) return 'in_progress';

    // Se TODOS estão completos → completed
    const allCompleted = batchVideos.every(v =>
        v.status === 'completed' || v.status === 'approved'
    );
    if (allCompleted) return 'completed';

    // Se ALGUM está em revisão (aguardando creator) → in_review
    const anyInReview = batchVideos.some(v =>
        ['in_review', 'delivered'].includes(v.status)
    );
    if (anyInReview) return 'in_review';

    // Se ALGUM está com correções solicitadas → revision_requested
    const anyRevisionRequested = batchVideos.some(v =>
        v.status === 'revision_requested'
    );
    if (anyRevisionRequested) return 'revision_requested';

    // Se ALGUM está em progresso ou pending → in_progress
    const anyInProgress = batchVideos.some(v =>
        v.status === 'in_progress' || v.status === 'pending'
    );
    if (anyInProgress) return 'in_progress';

    // Fallback
    return 'in_progress';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function ProjectKanban({
    projects,
    isArchivedView = false,
    onOpenBatch,
    onArchive,
    onUnarchive
}: ProjectKanbanProps) {

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

    // Agrupar por status
    const projectsByStatus = useMemo(() => {
        const grouped: Record<string, Project[]> = {};

        KANBAN_COLUMNS.forEach(col => {
            grouped[col.id] = [];
        });

        processedProjects.forEach(project => {
            const status = project.status;
            if (grouped[status]) {
                grouped[status].push(project);
            } else if (status === 'cancelled') {
                // Ignorar cancelados
            } else {
                // Fallback para in_progress
                grouped['in_progress'].push(project);
            }
        });

        return grouped;
    }, [processedProjects]);

    // Filtrar colunas visíveis
    const visibleColumns = useMemo(() => {
        if (isArchivedView) {
            return KANBAN_COLUMNS.filter(col => col.id === 'archived');
        }

        return KANBAN_COLUMNS.filter(col =>
            ['in_progress', 'in_review', 'revision_requested', 'pending_approval', 'completed'].includes(col.id)
        );
    }, [isArchivedView]);

    return (
        <div className="w-full h-full">
            <div className={cn(
                "grid gap-3 lg:gap-4",
                isArchivedView
                    ? "grid-cols-1 max-w-md mx-auto"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
            )}>
                {visibleColumns.map(column => {
                    const columnProjects = projectsByStatus[column.id] || [];
                    const Icon = column.icon;

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                'flex flex-col min-h-[400px] lg:min-h-[500px] rounded-xl border-2 shadow-sm',
                                column.bgColor,
                                column.borderColor
                            )}
                        >
                            {/* Header da coluna */}
                            <div className="flex flex-col gap-1 p-3 border-b border-inherit">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                                        style={{ backgroundColor: `${column.color}20` }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: column.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-xs lg:text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {column.name}
                                            </span>
                                            <span
                                                className="flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: column.color }}
                                            >
                                                {columnProjects.length}
                                            </span>
                                        </div>
                                        <p className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {column.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Cards da coluna */}
                            <div className="flex-1 p-2 lg:p-3 space-y-2 lg:space-y-3 overflow-y-auto">
                                {columnProjects.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 lg:h-32 text-center p-3">
                                        <Icon
                                            className="w-6 h-6 lg:w-8 lg:h-8 mb-2 opacity-30"
                                            style={{ color: column.color }}
                                        />
                                        <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            Nenhum projeto
                                        </p>
                                    </div>
                                ) : (
                                    columnProjects.map(project => (
                                        <ProjectKanbanCard
                                            key={project.id}
                                            project={project}
                                            columnColor={column.color}
                                            onOpenBatch={onOpenBatch}
                                            onArchive={onArchive}
                                            onUnarchive={onUnarchive}
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
