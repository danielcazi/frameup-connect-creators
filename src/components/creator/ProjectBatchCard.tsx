import {
    Calendar, Eye, Layers, Archive, ArchiveRestore, AlertTriangle,
    ChevronRight, CheckCircle, Clock, PlayCircle, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Project, BatchProgress, canArchiveBatch } from '@/utils/projectHelpers';
import { cn } from '@/lib/utils';

interface ProjectBatchCardProps {
    project: Project;
    progress: BatchProgress;
    columnColor?: string;
    onArchive?: (projectId: string) => void;
    onUnarchive?: (projectId: string) => void;
    onOpenBatch: (projectId: string) => void;
}

const ProjectBatchCard = ({
    project, progress, columnColor = '#3B82F6',
    onArchive, onUnarchive, onOpenBatch
}: ProjectBatchCardProps) => {

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL'
        }).format(value);
    };

    const getDeadlineInfo = (days: number | undefined) => {
        if (days === undefined) return {
            text: 'Sem prazo',
            className: 'text-gray-500'
        };
        if (days < 0) return {
            text: `${Math.abs(days)}d atrasado`,
            className: 'text-red-600 dark:text-red-400 font-semibold'
        };
        if (days <= 2) return {
            text: `${days}d restantes`,
            className: 'text-orange-600 dark:text-orange-400 font-medium'
        };
        return {
            text: `${days}d restantes`,
            className: 'text-gray-600 dark:text-gray-400'
        };
    };

    const deadlineInfo = getDeadlineInfo(project.deadline_days);
    const totalPrice = project.base_price * (project.batch_quantity || 1);
    const canArchive = canArchiveBatch(project.batch_videos || []);

    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group",
                "border-2 border-dashed",
                progress.hasDelayed
                    ? "border-red-400 dark:border-red-600 ring-2 ring-red-100 dark:ring-red-900/30"
                    : "border-blue-300 dark:border-blue-700 hover:border-blue-400"
            )}
            onClick={() => onOpenBatch(project.id)}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200">
                            <Layers className="w-3 h-3 mr-1.5" />
                            Lote · {progress.total} vídeos
                        </Badge>
                        {progress.hasDelayed && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Atrasado
                            </Badge>
                        )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 transition-colors" title={project.title}>
                        {project.title}
                    </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>

            {/* Preço e Prazo */}
            <div className="flex items-center gap-3 text-sm mb-3">
                <span className="text-gray-700 dark:text-gray-300 font-semibold">
                    {formatCurrency(totalPrice)}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className={cn("flex items-center gap-1", deadlineInfo.className)}>
                    <Calendar className="w-3.5 h-3.5" />
                    {deadlineInfo.text}
                </span>
            </div>

            {/* Barra de Progresso */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500 font-medium">Progresso do Lote</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {progress.completed}/{progress.total} concluídos
                    </span>
                </div>
                <Progress value={progress.percentage} className="h-2.5 bg-gray-100 dark:bg-gray-700" />
            </div>

            {/* Status Dots */}
            <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                {progress.completed > 0 && (
                    <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-green-700 dark:text-green-300 font-medium">{progress.completed} OK</span>
                    </div>
                )}
                {progress.inReview > 0 && (
                    <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3 text-purple-500" />
                        <span className="text-purple-700 dark:text-purple-300 font-medium">{progress.inReview} revisão</span>
                    </div>
                )}
                {progress.inProgress > 0 && (
                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                        <PlayCircle className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-700 dark:text-blue-300 font-medium">{progress.inProgress} ativo</span>
                    </div>
                )}
                {progress.revisionRequested > 0 && (
                    <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3 text-orange-500" />
                        <span className="text-orange-700 dark:text-orange-300 font-medium">{progress.revisionRequested} correção</span>
                    </div>
                )}
                {progress.pending > 0 && (
                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{progress.pending} aguard.</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <Button variant="default" size="sm" className="flex-1 h-9 text-xs font-medium"
                    onClick={(e) => { e.stopPropagation(); onOpenBatch(project.id); }}>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Abrir Projeto
                </Button>

                {project.is_archived && onUnarchive && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-green-600 hover:bg-green-50"
                        title="Desarquivar" onClick={(e) => { e.stopPropagation(); onUnarchive(project.id); }}>
                        <ArchiveRestore className="w-4 h-4" />
                    </Button>
                )}

                {!project.is_archived && canArchive && onArchive && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                        title="Arquivar" onClick={(e) => { e.stopPropagation(); onArchive(project.id); }}>
                        <Archive className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ProjectBatchCard;
