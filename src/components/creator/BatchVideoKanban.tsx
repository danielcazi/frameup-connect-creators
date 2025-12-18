import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Search,
    Play,
    Clock,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Eye,
    Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Project,
    BatchVideo,
    BatchProgress,
    calculateBatchProgress,
    mapBatchVideoStatusToKanbanColumn
} from '@/utils/projectHelpers';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINIÇÃO DAS COLUNAS DO KANBAN DO LOTE (SEM RASCUNHO E CANCELADOS)
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_KANBAN_COLUMNS = [
    {
        id: 'awaiting_editor',
        name: 'Aguardando Editor',
        description: 'Editor ainda não começou',
        color: '#F59E0B',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: Search,
    },
    {
        id: 'in_progress',
        name: 'Em Andamento',
        description: 'Editor trabalhando',
        color: '#3B82F6',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: Play,
    },
    {
        id: 'in_review',
        name: 'Em Revisão',
        description: 'Aguardando sua análise',
        color: '#8B5CF6',
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: Clock,
    },
    {
        id: 'revision_requested',
        name: 'Correções',
        description: 'Ajustes solicitados',
        color: '#F97316',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        icon: AlertTriangle,
    },
    {
        id: 'completed',
        name: 'Concluídos',
        description: 'Aprovados e finalizados',
        color: '#22C55E',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: CheckCircle,
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE DO CARD DE VÍDEO INDIVIDUAL
// ═══════════════════════════════════════════════════════════════════════════════

interface BatchVideoCardProps {
    video: BatchVideo;
    projectId: string;
    columnColor: string;
    basePrice: number;
}

const BatchVideoCard = ({ video, projectId, columnColor, basePrice }: BatchVideoCardProps) => {
    const navigate = useNavigate();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div
            className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            onClick={() => navigate(`/creator/project/${projectId}`)}
        >
            {/* Header com número e título */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                    {video.title}
                </h4>
                <Badge
                    variant="outline"
                    className="shrink-0 text-xs font-bold px-2"
                    style={{
                        borderColor: columnColor,
                        color: columnColor
                    }}
                >
                    nº {video.sequence_order}
                </Badge>
            </div>

            {/* Informações */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(basePrice)}
                </span>

                {video.revision_count && video.revision_count > 1 && (
                    <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            v{video.revision_count}
                        </span>
                    </>
                )}
            </div>

            {/* Botão de ação */}
            <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                style={{ borderColor: `${columnColor}50`, color: columnColor }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/creator/project/${projectId}`);
                }}
            >
                <Eye className="w-3 h-3 mr-1" />
                Ver Detalhes
            </Button>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL DO KANBAN DO LOTE
// ═══════════════════════════════════════════════════════════════════════════════

interface BatchVideoKanbanProps {
    project: Project;
    onBack: () => void;
}

const BatchVideoKanban = ({ project, onBack }: BatchVideoKanbanProps) => {
    const navigate = useNavigate();
    const batchVideos = project.batch_videos || [];

    // Calcular progresso
    const progress = useMemo(
        () => calculateBatchProgress(batchVideos, project.deadline_days),
        [batchVideos, project.deadline_days]
    );

    // Agrupar vídeos por coluna
    const videosByColumn = useMemo(() => {
        const grouped: Record<string, BatchVideo[]> = {};

        BATCH_KANBAN_COLUMNS.forEach(col => {
            grouped[col.id] = [];
        });

        batchVideos.forEach(video => {
            const columnId = mapBatchVideoStatusToKanbanColumn(video.status);
            if (grouped[columnId]) {
                grouped[columnId].push(video);
            }
        });

        // Ordenar por sequence_order dentro de cada coluna
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => a.sequence_order - b.sequence_order);
        });

        return grouped;
    }, [batchVideos]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const totalPrice = project.base_price * (project.batch_quantity || 1);

    return (
        <div className="space-y-4">
            {/* ═══════════════════════════════════════════════════════════════════
                HEADER / BREADCRUMB
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Back + Info */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBack}
                            className="gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </Button>

                        <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                    <Layers className="w-3 h-3 mr-1" />
                                    Lote
                                </Badge>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                    {project.title}
                                </h2>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span>{batchVideos.length} vídeos</span>
                                <span>•</span>
                                <span>{formatCurrency(totalPrice)}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {project.deadline_days !== undefined ? (
                                        project.deadline_days < 0 ? (
                                            <span className="text-red-500 font-medium">{Math.abs(project.deadline_days)}d atrasado</span>
                                        ) : (
                                            <span>{project.deadline_days}d restantes</span>
                                        )
                                    ) : (
                                        'Sem prazo'
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Progress Summary */}
                    <div className="flex items-center gap-4">
                        {/* Mini progress bar */}
                        <div className="hidden md:block w-32">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Progresso</span>
                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                    {progress.percentage}%
                                </span>
                            </div>
                            <Progress value={progress.percentage} className="h-2" />
                        </div>

                        {/* Status pills */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {progress.completed > 0 && (
                                <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full text-xs">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-green-700 dark:text-green-300 font-medium">
                                        {progress.completed}
                                    </span>
                                </div>
                            )}
                            {progress.inReview > 0 && (
                                <div className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1 rounded-full text-xs">
                                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                                    <span className="text-purple-700 dark:text-purple-300 font-medium">
                                        {progress.inReview}
                                    </span>
                                </div>
                            )}
                            {progress.inProgress > 0 && (
                                <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full text-xs">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                                        {progress.inProgress}
                                    </span>
                                </div>
                            )}
                            {progress.hasDelayed && (
                                <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full text-xs">
                                    <AlertTriangle className="w-3 h-3 text-red-500" />
                                    <span className="text-red-700 dark:text-red-300 font-medium">
                                        Atrasado
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Button to project details */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/creator/project/${project.id}`)}
                        >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Detalhes
                        </Button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                KANBAN GRID
            ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {BATCH_KANBAN_COLUMNS.map(column => {
                    const columnVideos = videosByColumn[column.id] || [];
                    const Icon = column.icon;

                    return (
                        <div
                            key={column.id}
                            className={cn(
                                'flex flex-col min-h-[400px] rounded-xl border-2 shadow-sm',
                                column.bgColor,
                                column.borderColor
                            )}
                        >
                            {/* Column Header */}
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
                                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {column.name}
                                            </span>
                                            <span
                                                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0"
                                                style={{ backgroundColor: column.color }}
                                            >
                                                {columnVideos.length}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {column.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[500px]">
                                {columnVideos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 text-center p-3">
                                        <Icon
                                            className="w-6 h-6 mb-2 opacity-30"
                                            style={{ color: column.color }}
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Nenhum vídeo
                                        </p>
                                    </div>
                                ) : (
                                    columnVideos.map(video => (
                                        <BatchVideoCard
                                            key={video.id}
                                            video={video}
                                            projectId={project.id}
                                            columnColor={column.color}
                                            basePrice={project.base_price}
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
};

export default BatchVideoKanban;
