import { useState } from 'react';
import {
    CheckCircle2,
    Clock,
    PlayCircle,
    Package,
    AlertCircle,
    ChevronDown,
    Upload,
    Eye,
    FileText,
    Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchVideo } from '@/hooks/useProjectDetails';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES
// =====================================================
interface BatchVideosListProps {
    videos: BatchVideo[];
    userRole: 'creator' | 'editor';
    deliveryMode?: 'sequential' | 'simultaneous' | null;
    onVideoClick?: (video: BatchVideo) => void;
    onDeliverClick?: (video: BatchVideo) => void;
    onReviewClick?: (video: BatchVideo) => void;
}

// =====================================================
// CONFIGURAÇÃO DE STATUS
// =====================================================
const statusConfig: Record<string, {
    label: string;
    icon: any;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
}> = {
    pending: {
        label: 'Aguardando',
        icon: Clock,
        bgColor: 'bg-gray-50 dark:bg-gray-800/50',
        borderColor: 'border-gray-200 dark:border-gray-700',
        textColor: 'text-gray-700 dark:text-gray-300',
        iconColor: 'text-gray-500'
    },
    in_progress: {
        label: 'Em Produção',
        icon: PlayCircle,
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300',
        iconColor: 'text-blue-500'
    },
    delivered: {
        label: 'Entregue',
        icon: Package,
        bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        borderColor: 'border-purple-200 dark:border-purple-800',
        textColor: 'text-purple-700 dark:text-purple-300',
        iconColor: 'text-purple-500'
    },
    revision: {
        label: 'Em Revisão',
        icon: AlertCircle,
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        textColor: 'text-orange-700 dark:text-orange-300',
        iconColor: 'text-orange-500'
    },
    approved: {
        label: 'Aprovado',
        icon: CheckCircle2,
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        textColor: 'text-green-700 dark:text-green-300',
        iconColor: 'text-green-500'
    }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function BatchVideosList({
    videos,
    userRole,
    deliveryMode,
    onVideoClick,
    onDeliverClick,
    onReviewClick
}: BatchVideosListProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Toggle expansão
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Estatísticas
    const stats = {
        approved: videos.filter(v => v.status === 'approved').length,
        delivered: videos.filter(v => v.status === 'delivered').length,
        inProgress: videos.filter(v => v.status === 'in_progress').length,
        revision: videos.filter(v => v.status === 'revision').length,
        pending: videos.filter(v => v.status === 'pending').length,
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground">
                    📦 Vídeos do Lote ({videos.length})
                </h2>

                {/* Mini Stats */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    {stats.approved > 0 && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                            ✅ {stats.approved} aprovado{stats.approved > 1 ? 's' : ''}
                        </span>
                    )}
                    {stats.delivered > 0 && (
                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
                            📦 {stats.delivered} entregue{stats.delivered > 1 ? 's' : ''}
                        </span>
                    )}
                    {stats.revision > 0 && (
                        <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full font-medium">
                            🔄 {stats.revision} em revisão
                        </span>
                    )}
                    {stats.inProgress > 0 && (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                            ▶️ {stats.inProgress} em produção
                        </span>
                    )}
                </div>
            </div>

            {/* Lista de Vídeos */}
            <div className="space-y-3">
                {videos.map((video) => {
                    const config = statusConfig[video.status] || statusConfig.pending;
                    const Icon = config.icon;
                    const isExpanded = expandedIds.has(video.id);

                    // Determinar se pode entregar (editor)
                    const canDeliver = userRole === 'editor' &&
                        ['in_progress', 'revision'].includes(video.status);

                    // Determinar se pode revisar (creator)
                    const canReview = userRole === 'creator' && video.status === 'delivered';

                    // Verificar se está bloqueado (modo sequencial)
                    const isBlocked = deliveryMode === 'sequential' &&
                        video.status === 'pending' &&
                        videos.some(v => v.sequence_order < video.sequence_order && v.status !== 'approved');

                    return (
                        <div
                            key={video.id}
                            className={`border-2 rounded-xl transition-all duration-200 overflow-hidden ${config.bgColor} ${config.borderColor} ${isBlocked ? 'opacity-60' : ''
                                }`}
                        >
                            {/* Card Header */}
                            <div className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Número do Vídeo */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border-2 shrink-0 ${video.status === 'approved'
                                            ? 'bg-green-500 text-white border-green-600'
                                            : 'bg-card border-border text-foreground'
                                        }`}>
                                        {video.status === 'approved' ? (
                                            <CheckCircle2 className="w-6 h-6" />
                                        ) : (
                                            video.sequence_order
                                        )}
                                    </div>

                                    {/* Info Principal */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-base text-foreground mb-1 truncate">
                                            {video.title || `Vídeo #${video.sequence_order}`}
                                        </h3>

                                        {/* Instruções (preview) */}
                                        {video.specific_instructions && !isExpanded && (
                                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                                {video.specific_instructions}
                                            </p>
                                        )}

                                        {/* Tags de Status */}
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {/* Status */}
                                            <span className={`inline-flex items-center gap-1 font-semibold ${config.iconColor}`}>
                                                <Icon className="w-3.5 h-3.5" />
                                                {config.label}
                                            </span>

                                            {/* Revisões */}
                                            {video.revision_count > 0 && (
                                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                                    🔄 {video.revision_count} revisão(ões)
                                                </span>
                                            )}

                                            {/* Timestamp */}
                                            {video.selected_timestamp_start !== null && (
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Timer className="w-3 h-3" />
                                                    {Math.floor((video.selected_timestamp_start || 0) / 60)}min -
                                                    {Math.floor((video.selected_timestamp_end || 0) / 60)}min
                                                </span>
                                            )}

                                            {/* Editor escolhe */}
                                            {video.editor_can_choose_timing && (
                                                <span className="text-primary font-medium">
                                                    ✨ Editor escolhe
                                                </span>
                                            )}

                                            {/* Pagamento (editor) */}
                                            {userRole === 'editor' && video.payment_released_at && (
                                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                                    💰 R$ {video.payment_amount.toFixed(2)}
                                                </span>
                                            )}

                                            {/* Data de aprovação */}
                                            {video.approved_at && (
                                                <span className="text-muted-foreground">
                                                    Aprovado {formatDistanceToNow(new Date(video.approved_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            )}

                                            {/* Bloqueado */}
                                            {isBlocked && (
                                                <span className="text-muted-foreground">
                                                    🔒 Aguardando anterior
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ações */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Botão Entregar (Editor) */}
                                        {canDeliver && onDeliverClick && (
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeliverClick(video);
                                                }}
                                                className={video.status === 'revision'
                                                    ? 'bg-orange-500 hover:bg-orange-600'
                                                    : 'bg-blue-500 hover:bg-blue-600'
                                                }
                                            >
                                                <Upload className="w-4 h-4 mr-1.5" />
                                                {video.status === 'revision' ? 'Reenviar' : 'Entregar'}
                                            </Button>
                                        )}

                                        {/* Botão Revisar (Creator) */}
                                        {canReview && onReviewClick && (
                                            <Button
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onReviewClick(video);
                                                }}
                                                className="bg-purple-500 hover:bg-purple-600"
                                            >
                                                <Eye className="w-4 h-4 mr-1.5" />
                                                Revisar
                                            </Button>
                                        )}

                                        {/* Botão Expandir */}
                                        <button
                                            onClick={() => toggleExpand(video.id)}
                                            className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                                            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                                        >
                                            <ChevronDown
                                                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Expandido */}
                            {isExpanded && (
                                <div className="border-t-2 bg-card/50 p-4 space-y-4">
                                    {/* Instruções Completas */}
                                    {video.specific_instructions && (
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                                                <FileText className="w-3.5 h-3.5" />
                                                Instruções Específicas
                                            </div>
                                            <p className="text-sm text-foreground bg-background rounded-lg p-3 border border-border whitespace-pre-wrap">
                                                {video.specific_instructions}
                                            </p>
                                        </div>
                                    )}

                                    {/* Minutagem */}
                                    {(video.selected_timestamp_start !== null || video.editor_can_choose_timing) && (
                                        <div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2">
                                                <Timer className="w-3.5 h-3.5" />
                                                Minutagem
                                            </div>
                                            {video.editor_can_choose_timing ? (
                                                <p className="text-sm text-primary font-medium">
                                                    ✨ Editor pode escolher o trecho do material bruto
                                                </p>
                                            ) : (
                                                <p className="text-sm text-foreground">
                                                    Do minuto <strong>{Math.floor((video.selected_timestamp_start || 0) / 60)}</strong> ao
                                                    minuto <strong>{Math.floor((video.selected_timestamp_end || 0) / 60)}</strong>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Timeline Visual */}
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3">
                                            Progresso do Vídeo
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {['pending', 'in_progress', 'delivered', 'approved'].map((status, index) => {
                                                const stepConfig = statusConfig[status];
                                                const StepIcon = stepConfig.icon;
                                                const isPassed =
                                                    (status === 'pending' && video.status !== 'pending') ||
                                                    (status === 'in_progress' && ['delivered', 'revision', 'approved'].includes(video.status)) ||
                                                    (status === 'delivered' && video.status === 'approved');
                                                const isCurrent = video.status === status ||
                                                    (status === 'delivered' && video.status === 'revision');

                                                return (
                                                    <div key={status} className="flex items-center flex-1">
                                                        <div className={`flex flex-col items-center flex-1 ${isCurrent ? 'opacity-100' : isPassed ? 'opacity-100' : 'opacity-40'
                                                            }`}>
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPassed ? 'bg-green-500 text-white' :
                                                                    isCurrent ? `${stepConfig.bgColor} ${stepConfig.iconColor}` :
                                                                        'bg-muted text-muted-foreground'
                                                                }`}>
                                                                {isPassed ? (
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                ) : (
                                                                    <StepIcon className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] mt-1 text-center">
                                                                {stepConfig.label}
                                                            </span>
                                                        </div>
                                                        {index < 3 && (
                                                            <div className={`h-0.5 flex-1 mx-1 ${isPassed ? 'bg-green-500' : 'bg-muted'
                                                                }`} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Botão Ver Detalhes */}
                                    {onVideoClick && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onVideoClick(video)}
                                            className="w-full"
                                        >
                                            Ver Todos os Detalhes
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
