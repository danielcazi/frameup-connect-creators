import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Clock,
    DollarSign,
    Calendar,
    Eye,
    User,
    Upload
} from 'lucide-react';
import ProjectBatchCard from './ProjectBatchCard';

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

interface BatchProgress {
    total: number;
    completed: number;
    inReview: number;
    inProgress: number;
    revisionRequested: number;
    pending: number;
    percentage: number;
    hasDelayed: boolean;
}

interface Project {
    id: string;
    title: string;
    status: string;
    base_price: number;
    deadline_days: number;
    created_at: string;
    revision_count?: number;
    is_batch?: boolean;
    batch_quantity?: number;
    batch_videos?: BatchVideo[];
    users?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

interface ProjectKanbanCardProps {
    project: Project;
    columnColor?: string;
    onOpenBatch?: (projectId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNÇÃO PARA CALCULAR PROGRESSO DO LOTE
// ═══════════════════════════════════════════════════════════════════════════════

function calculateBatchProgress(batchVideos: BatchVideo[], deadlineDays?: number): BatchProgress {
    if (!batchVideos || batchVideos.length === 0) {
        return {
            total: 0, completed: 0, inReview: 0, inProgress: 0,
            revisionRequested: 0, pending: 0, percentage: 0, hasDelayed: false
        };
    }

    const total = batchVideos.length;
    const completed = batchVideos.filter(v =>
        v.status === 'completed' || v.status === 'approved'
    ).length;
    const inReview = batchVideos.filter(v =>
        ['in_review', 'delivered'].includes(v.status)
    ).length;
    const inProgress = batchVideos.filter(v => v.status === 'in_progress').length;
    const revisionRequested = batchVideos.filter(v => v.status === 'revision_requested').length;
    const pending = batchVideos.filter(v => v.status === 'pending').length;
    const hasDelayed = deadlineDays !== undefined && deadlineDays < 0;

    return {
        total, completed, inReview, inProgress, revisionRequested, pending,
        percentage: Math.round((completed / total) * 100),
        hasDelayed
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

function ProjectKanbanCard({
    project,
    columnColor = '#3B82F6',
    onOpenBatch
}: ProjectKanbanCardProps) {
    const navigate = useNavigate();

    // ═══════════════════════════════════════════════════════════════════════════
    // SE FOR PROJETO EM LOTE, RENDERIZAR CARD MÃE
    // ═══════════════════════════════════════════════════════════════════════════
    if (project.is_batch && project.batch_videos && project.batch_videos.length > 0 && onOpenBatch) {
        const progress = calculateBatchProgress(project.batch_videos, project.deadline_days);

        return (
            <ProjectBatchCard
                project={project}
                progress={progress}
                columnColor={columnColor}
                onOpenBatch={onOpenBatch}
            />
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CARD INDIVIDUAL (PROJETO AVULSO)
    // ═══════════════════════════════════════════════════════════════════════════

    const creator = project.users;

    // Formatação de data
    const createdDate = new Date(project.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    // Verificar se precisa entregar
    const needsDelivery = ['in_progress', 'revision_requested'].includes(project.status);
    const isCompleted = project.status === 'completed';

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <Card
            className="hover:shadow-md transition-all cursor-pointer group border"
            onClick={() => navigate(`/editor/project/${project.id}`)}
        >
            <CardContent className="p-3 space-y-2">
                {/* Header com título */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                        {project.title}
                    </h3>

                    {/* Badge de versão se tiver revisões */}
                    {project.revision_count && project.revision_count > 1 && (
                        <Badge
                            variant="secondary"
                            className="text-[10px] font-bold shrink-0 px-1.5 py-0"
                            style={{
                                backgroundColor: `${columnColor}20`,
                                color: columnColor,
                            }}
                        >
                            v{project.revision_count}
                        </Badge>
                    )}
                </div>

                {/* Creator Info */}
                {creator && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={creator.profile_photo_url} />
                            <AvatarFallback className="text-[10px] bg-gray-200 dark:bg-gray-700">
                                {creator.full_name?.charAt(0) || <User className="w-3 h-3" />}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {creator.full_name || creator.username}
                        </span>
                    </div>
                )}

                {/* Informações do projeto */}
                <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(project.base_price)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{project.deadline_days}d</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{createdDate}</span>
                    </div>
                </div>

                {/* Botão de ação */}
                <div className="pt-2">
                    <Button
                        variant={needsDelivery ? "default" : "outline"}
                        size="sm"
                        className="w-full text-xs font-medium h-8"
                        style={needsDelivery ? {} : { borderColor: columnColor, color: columnColor }}
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/editor/project/${project.id}`);
                        }}
                    >
                        {needsDelivery ? (
                            <>
                                <Upload className="w-3 h-3 mr-1.5" />
                                Entregar Vídeo
                            </>
                        ) : (
                            <>
                                <Eye className="w-3 h-3 mr-1.5" />
                                Ver
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default ProjectKanbanCard;
