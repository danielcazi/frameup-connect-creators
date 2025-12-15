// src/components/project/BatchVideosList.tsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock, AlertCircle, Play, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoStatusBadge } from './VideoStatusBadge';
import { BatchVideo, canEditVideo, getVideoStatusConfig } from '@/utils/batchHelpers';
import { cn } from '@/lib/utils';

interface BatchVideosListProps {
    videos: BatchVideo[];
    deliveryMode: 'sequential' | 'simultaneous';
    onReviewClick?: (video: BatchVideo) => void;
    onViewVideo?: (video: BatchVideo) => void;
}

export function BatchVideosList({
    videos,
    deliveryMode,
    onReviewClick,
    onViewVideo
}: BatchVideosListProps) {
    const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

    // Ordenar vídeos por sequence_order
    const sortedVideos = [...videos].sort((a, b) => a.sequence_order - b.sequence_order);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    🎬 Vídeos do Lote ({videos.length})
                </h3>
                <span className="text-xs text-muted-foreground">
                    {deliveryMode === 'sequential' ? 'Entrega: 1 por vez' : 'Entrega: Todos juntos'}
                </span>
            </div>

            {sortedVideos.map((video, index) => {
                const isLocked = !canEditVideo(sortedVideos, index, deliveryMode);
                const isExpanded = expandedVideoId === video.id;
                const statusConfig = getVideoStatusConfig(video.status);

                return (
                    <div
                        key={video.id}
                        className={cn(
                            'border-2 rounded-xl transition-all duration-200',
                            isLocked
                                ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-70'
                                : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                        )}
                    >
                        {/* Header do Card - Sempre visível */}
                        <div
                            className="p-4 cursor-pointer"
                            onClick={() => setExpandedVideoId(isExpanded ? null : video.id)}
                        >
                            <div className="flex items-center gap-4">
                                {/* Número do Vídeo */}
                                <div className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
                                    statusConfig.bgColor,
                                    statusConfig.textColor
                                )}>
                                    {video.sequence_order}
                                </div>

                                {/* Informações */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-foreground truncate">
                                            {video.title || `Vídeo ${video.sequence_order}`}
                                        </h4>

                                        {/* Badge de Status */}
                                        <VideoStatusBadge status={video.status} size="sm" />

                                        {/* Badge de Bloqueado */}
                                        {isLocked && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                <Lock className="w-3 h-3" />
                                                Bloqueado
                                            </span>
                                        )}
                                    </div>

                                    {/* Descrição curta do status */}
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {isLocked
                                            ? `Aguardando aprovação do Vídeo ${index}`
                                            : statusConfig.description
                                        }
                                    </p>
                                </div>

                                {/* Ícone de Expandir */}
                                <div className="flex-shrink-0">
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo Expandido */}
                        {isExpanded && (
                            <div className="px-4 pb-4 pt-0 border-t border-border/50">
                                {/* Barra de Progresso (se em progresso) */}
                                {video.status === 'in_progress' && video.progress_percent !== undefined && (
                                    <div className="mb-4 mt-4">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Progresso da Edição</span>
                                            <span className="font-bold text-blue-600">{video.progress_percent}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                style={{ width: `${video.progress_percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Timeline de Status */}
                                <div className="mt-4">
                                    <p className="text-xs font-medium text-muted-foreground mb-3">Progresso do Vídeo</p>
                                    <div className="flex items-center justify-between relative">
                                        {/* Linha conectora */}
                                        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />

                                        {/* Steps */}
                                        {['Aguardando', 'Em Produção', 'Entregue', 'Aprovado'].map((step, stepIndex) => {
                                            const stepStatuses = ['pending', 'in_progress', 'delivered', 'approved']; // Changed 'awaiting_review' to 'delivered' to match my helper fix earlier? 
                                            // Wait, in Step 36, I mapped 'delivered' to awaitingReview in stats, BUT status enum was:
                                            // 'pending' | 'in_progress' | 'delivered' | 'revision' | 'approved'
                                            // So here 'delivered' is the correct status string from DB.
                                            // 'awaiting_review' is not in the type definition in batchHelpers.ts Step 36.
                                            // Step 36: | 'delivered' // Entregue, aguardando revisão (awaiting_review)
                                            // So I should use 'delivered' in the array, not 'awaiting_review'.

                                            const currentStepIndex = stepStatuses.indexOf(video.status === 'revision' ? 'in_progress' : video.status);
                                            // If revision, it's sort of back to in_progress or delivered? 
                                            // 'revision' status usually means adjustments requested.

                                            const isCompleted = stepIndex <= stepStatuses.indexOf(video.status === 'revision' ? 'delivered' : video.status);
                                            // This logic is tricky. Let's stick to simple mapping or user provided code?
                                            // User provided: const stepStatuses = ['pending', 'in_progress', 'awaiting_review', 'approved'];
                                            // User uses 'awaiting_review'. BUT my helper uses 'delivered'.
                                            // I MUST FIX THIS to match my helper.

                                            return (
                                                <div key={step} className="flex flex-col items-center z-10">
                                                    <div className={cn(
                                                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                                                        // Logic here needs to support my 'delivered' status status mapping
                                                        // Let's use a simpler check logic inline
                                                        stepIndex <= (
                                                            video.status === 'approved' ? 3 :
                                                                video.status === 'delivered' ? 2 :
                                                                    video.status === 'revision' ? 2 : // revision is after delivery usually
                                                                        video.status === 'in_progress' ? 1 :
                                                                            0
                                                        )
                                                            ? 'bg-green-500 text-white'
                                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                    )}>
                                                        {stepIndex <= (
                                                            video.status === 'approved' ? 3 :
                                                                video.status === 'delivered' ? 2 :
                                                                    video.status === 'revision' ? 2 :
                                                                        video.status === 'in_progress' ? 1 :
                                                                            0
                                                        ) ? '✓' : stepIndex + 1}
                                                    </div>
                                                    <span className={cn(
                                                        'text-xs mt-1',
                                                        // same logic for current
                                                        // ...
                                                        'text-muted-foreground'
                                                    )}>
                                                        {step}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex gap-2 mt-4">
                                    {/* Botão de Revisar */}
                                    {/* user code used 'awaiting_review', I must use 'delivered' */}
                                    {video.status === 'delivered' && onReviewClick && (
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReviewClick(video);
                                            }}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            <Play className="w-4 h-4 mr-1" />
                                            Revisar Agora
                                        </Button>
                                    )}

                                    {/* Botão de Ver Vídeo Final */}
                                    {video.status === 'approved' && video.delivery_url && onViewVideo && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewVideo(video);
                                            }}
                                        >
                                            <ExternalLink className="w-4 h-4 mr-1" />
                                            Ver Vídeo Final
                                        </Button>
                                    )}

                                    {/* Mensagem de Bloqueio */}
                                    {isLocked && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Aprove o Vídeo {index} para desbloquear este</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default BatchVideosList;
