import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    ChevronDown,
    ChevronUp,
    Upload,
    MessageSquare,
    Package,
    Clock,
    CheckCircle2,
    AlertCircle,
    PlayCircle,
    DollarSign,
    Calendar
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EditorProject, BatchVideo } from '@/hooks/useEditorProjects';
import { Button } from '@/components/ui/button';

// =====================================================
// CONFIGURAÇÃO DE STATUS DOS VÍDEOS
// =====================================================
const videoStatusConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
    pending: {
        label: 'Pendente',
        icon: '⏳',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    in_progress: {
        label: 'Em Produção',
        icon: '🎬',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    delivered: {
        label: 'Entregue',
        icon: '📦',
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    revision: {
        label: 'Em Revisão',
        icon: '🔄',
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    },
    approved: {
        label: 'Aprovado',
        icon: '✅',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30'
    }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
interface EditorProjectCardProps {
    project: EditorProject;
    viewMode?: 'grid' | 'list';
}

export function EditorProjectCard({ project, viewMode = 'grid' }: EditorProjectCardProps) {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);

    // Encontrar próximo vídeo a trabalhar
    const getNextVideo = (): BatchVideo | null => {
        if (!project.is_batch || !project.batch_videos) return null;

        // Prioridade: revisão > em progresso > pendente
        const revisionVideo = project.batch_videos.find(v => v.status === 'revision');
        if (revisionVideo) return revisionVideo;

        const inProgressVideo = project.batch_videos.find(v => v.status === 'in_progress');
        if (inProgressVideo) return inProgressVideo;

        if (project.batch_delivery_mode === 'sequential') {
            return project.batch_videos.find(v => v.status === 'pending') || null;
        }

        return null;
    };

    const nextVideo = getNextVideo();

    // Calcular ganhos
    const earnedSoFar = project.editor_earnings_released || 0;
    const earningsPerVideo = project.editor_earnings_per_video || project.base_price * 0.85;
    const totalPotential = earningsPerVideo * (project.batch_quantity || 1);
    const pendingEarnings = totalPotential - earnedSoFar;

    // Calcular progresso
    const approvedCount = project.videos_approved || 0;
    const totalVideos = project.batch_quantity || 1;
    const progressPercentage = (approvedCount / totalVideos) * 100;

    // Status do projeto
    const hasRevision = project.batch_videos?.some(v => v.status === 'revision');
    const hasDelivered = project.batch_videos?.some(v => v.status === 'delivered');

    return (
        <div className={`border-2 rounded-xl bg-card transition-all hover:shadow-lg ${hasRevision
                ? 'border-orange-300 dark:border-orange-700'
                : hasDelivered
                    ? 'border-purple-300 dark:border-purple-700'
                    : 'border-border'
            }`}>
            <div className="p-5">

                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-lg text-foreground truncate">
                                {project.title}
                            </h3>
                            {project.is_batch && (
                                <span className="shrink-0 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    Lote
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Cliente: <span className="font-medium text-foreground">{project.creator_name}</span>
                        </p>
                    </div>

                    {/* Indicador de atenção */}
                    {hasRevision && (
                        <div className="shrink-0 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Revisão Pendente
                        </div>
                    )}
                </div>

                {/* Progresso (se lote) */}
                {project.is_batch && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-semibold text-foreground">
                                {approvedCount}/{totalVideos} aprovados
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{project.batch_delivery_mode === 'sequential' ? '📅 Sequencial' : '⚡ Simultâneo'}</span>
                            <span>{progressPercentage.toFixed(0)}%</span>
                        </div>
                    </div>
                )}

                {/* Card de Ganhos */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                Ganhos Liberados
                            </div>
                            <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                R$ {earnedSoFar.toFixed(2)}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">A Receber</div>
                            <div className="text-sm font-semibold text-foreground">
                                R$ {pendingEarnings.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    {project.is_batch && (
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                            R$ {earningsPerVideo.toFixed(2)} por vídeo aprovado
                        </div>
                    )}
                </div>

                {/* Próximo Vídeo (se lote) */}
                {nextVideo && (
                    <div className={`rounded-lg p-3 mb-4 border ${nextVideo.status === 'revision'
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        }`}>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`font-semibold ${nextVideo.status === 'revision'
                                    ? 'text-orange-700 dark:text-orange-400'
                                    : 'text-blue-700 dark:text-blue-400'
                                }`}>
                                {nextVideo.status === 'revision' ? '🔄 Corrigir:' : '🎯 Próximo:'}
                            </span>
                            <span className="text-foreground font-medium">
                                {nextVideo.title || `Vídeo #${nextVideo.sequence_order}`}
                            </span>
                        </div>
                        {nextVideo.status === 'revision' && nextVideo.revision_count > 0 && (
                            <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Revisão #{nextVideo.revision_count + 1}
                            </div>
                        )}
                    </div>
                )}

                {/* Prazo */}
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Prazo
                    </span>
                    <span className="text-foreground">
                        {project.deadline
                            ? formatDistanceToNow(new Date(project.deadline), { addSuffix: true, locale: ptBR })
                            : 'Não definido'
                        }
                    </span>
                </div>

                {/* Botões */}
                <div className="flex gap-2">
                    <Button
                        onClick={() => navigate(`/editor/project/${project.id}`)}
                        className="flex-1"
                    >
                        <Eye className="w-4 h-4 mr-2" />
                        Gerenciar
                    </Button>

                    {/* Botão de Entrega Rápida */}
                    {nextVideo && (nextVideo.status === 'in_progress' || nextVideo.status === 'revision') && (
                        <Button
                            onClick={() => navigate(`/editor/project/${project.id}/deliver/${nextVideo.id}`)}
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                        >
                            <Upload className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Botão de Chat */}
                    <Button
                        onClick={() => navigate(`/editor/project/${project.id}/chat`)}
                        variant="outline"
                    >
                        <MessageSquare className="w-4 h-4" />
                    </Button>

                    {/* Botão de Expandir (se lote) */}
                    {project.is_batch && project.batch_videos && project.batch_videos.length > 0 && (
                        <Button
                            onClick={() => setExpanded(!expanded)}
                            variant="outline"
                        >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                    )}
                </div>
            </div>

            {/* Lista Expandida de Vídeos */}
            {project.is_batch && expanded && project.batch_videos && (
                <div className="border-t border-border bg-muted/30 p-5 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        📋 Status dos Vídeos ({project.batch_videos.length})
                    </h4>

                    {project.batch_videos.map((video) => {
                        const config = videoStatusConfig[video.status] || videoStatusConfig.pending;

                        return (
                            <div
                                key={video.id}
                                onClick={() => {
                                    if (video.status === 'in_progress' || video.status === 'revision') {
                                        navigate(`/editor/project/${project.id}/deliver/${video.id}`);
                                    }
                                }}
                                className={`flex items-center justify-between p-3 bg-card border border-border rounded-lg transition-all ${video.status === 'in_progress' || video.status === 'revision'
                                        ? 'cursor-pointer hover:border-primary/50'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${config.bgColor} ${config.color}`}>
                                        {video.sequence_order}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-foreground truncate">
                                            {video.title || `Vídeo #${video.sequence_order}`}
                                        </div>
                                        {video.revision_count > 0 && (
                                            <div className="text-xs text-amber-600 dark:text-amber-400">
                                                🔄 {video.revision_count} revisão(ões)
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-lg">{config.icon}</span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}>
                                        {config.label}
                                    </span>
                                    {video.payment_released_at && (
                                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium">
                                            💰 Pago
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
