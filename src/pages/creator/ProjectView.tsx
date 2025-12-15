import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { BatchVideosList } from '@/components/project/BatchVideosList';
import { BatchSummaryCard } from '@/components/project/BatchSummaryCard';
import { ProjectMaterialCard } from '@/components/project/ProjectMaterialCard';
import { ReviewPanel } from '@/components/creator/ReviewPanel';
import { useProjectDetails, BatchVideo, getNextVideoToReview, getBatchStats } from '@/hooks/useProjectDetails';
import { useBatchVideosRealtime } from '@/hooks/useBatchVideosRealtime';
import { Button } from '@/components/ui/button';
import {
    FileText,
    MessageSquare,
    AlertCircle,
    Loader2,
    ArrowLeft,
    Settings,
    DollarSign,
    Calendar,
    Video
} from 'lucide-react';
import {
    calculateProjectStatus,
    calculateProjectTotalValue,
    calculateBatchStats
} from '@/utils/batchHelpers';
import Chat from '@/pages/shared/Chat';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function CreatorProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { project, loading, error, refresh } = useProjectDetails(id!);



    // Estado para vídeo selecionado para revisão
    const [selectedVideoForReview, setSelectedVideoForReview] = useState<{
        video: BatchVideo;
        delivery: any;
    } | null>(null);

    // Próximo vídeo a revisar
    const nextVideoToReview = useMemo(() => {
        if (!project?.batch_videos) return null;
        return getNextVideoToReview(project.batch_videos);
    }, [project?.batch_videos]);

    // Stats do lote (Using helper)
    const batchStats = useMemo(() => {
        if (!project?.batch_videos) return null;
        return calculateBatchStats(project.batch_videos);
    }, [project?.batch_videos]);

    // Enriquecer vídeos com URL de entrega (se houver)
    const enrichedBatchVideos = useMemo(() => {
        if (!project?.batch_videos) return [];
        return project.batch_videos.map(video => {
            const delivery = project.deliveries.find(d => d.batch_video_id === video.id);
            return {
                ...video,
                delivery_url: delivery?.video_url
            };
        });
    }, [project?.batch_videos, project?.deliveries]);

    // Status calculado do projeto
    const derivedStatus = useMemo(() => {
        if (!project) return 'pending';
        // Se for lote, usa lógica estrita
        if (project.is_batch && project.batch_videos) {
            return calculateProjectStatus(project.batch_videos);
        }
        return project.status;
    }, [project]);

    // Financeiro calculado
    const financials = useMemo(() => {
        if (!project) return { totalAfterDiscount: 0, pricePerVideo: 0 };
        return calculateProjectTotalValue(
            project.base_price,
            project.batch_quantity || 1,
            project.batch_discount_percent || 0
        );
    }, [project]);

    // Configurar realtime dedicado para lotes
    useBatchVideosRealtime({
        projectId: project?.id,
        onUpdate: () => {
            console.log('[ProjectView] Atualizando via hook dedicado');
            refresh();
        }
    });

    // Objeto de projeto modificado para exibição no Header
    const displayProject = useMemo(() => {
        if (!project) return null;
        return {
            ...project,
            status: derivedStatus,
            videos_approved: batchStats?.approved || 0
        };
    }, [project, derivedStatus, batchStats]);

    // =====================================================
    // LOADING STATE
    // =====================================================
    if (loading) {
        return (
            <DashboardLayout userType="creator">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Carregando projeto...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // =====================================================
    // ERROR STATE
    // =====================================================
    if (error || !project || !displayProject) {
        return (
            <DashboardLayout userType="creator">
                <div className="max-w-md mx-auto text-center py-12">
                    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Projeto não encontrado
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {error || 'O projeto que você procura não existe ou foi removido.'}
                    </p>
                    <Button onClick={() => navigate('/creator/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    // Handler para abrir revisão
    const handleReviewClick = (video: BatchVideo) => {
        const delivery = project.deliveries.find(d => d.batch_video_id === video.id);
        if (delivery) {
            setSelectedVideoForReview({ video, delivery });
        }
    };

    // Handler para ver vídeo
    const handleViewVideo = (video: BatchVideo) => {
        if (video.delivery_url) {
            window.open(video.delivery_url, '_blank');
        }
    };

    return (
        <DashboardLayout userType="creator">
            {/* Header do Projeto */}
            <ProjectHeader project={displayProject} userRole="creator" />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* =========================================
              COLUNA PRINCIPAL (2/3)
          ========================================= */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Alerta: Vídeo para Revisar */}
                        {nextVideoToReview && !selectedVideoForReview && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                        <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-1">
                                            📦 Vídeo aguardando sua revisão!
                                        </h3>
                                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                                            <strong>#{nextVideoToReview.sequence_order}</strong> - {nextVideoToReview.title || `Vídeo ${nextVideoToReview.sequence_order}`}
                                        </p>
                                        <Button
                                            onClick={() => handleReviewClick(nextVideoToReview)}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            Revisar Agora
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Painel de Revisão */}
                        {selectedVideoForReview && (
                            <div className="bg-card border-2 border-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-foreground">
                                        📝 Revisar Vídeo #{selectedVideoForReview.video.sequence_order}
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedVideoForReview(null)}
                                    >
                                        Fechar
                                    </Button>
                                </div>
                                <ReviewPanel
                                    projectId={project.id}
                                    batchVideo={selectedVideoForReview.video}
                                    delivery={selectedVideoForReview.delivery}
                                    editorEarningsPerVideo={project.editor_earnings_per_video}
                                    editorName={project.editor_name || undefined}
                                    onUpdate={() => {
                                        refresh();
                                        setSelectedVideoForReview(null);
                                    }}
                                />
                            </div>
                        )}

                        {/* Descrição do Projeto */}
                        <div className="bg-card border-2 border-border rounded-xl p-6">
                            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Descrição do Projeto
                            </h2>
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                {project.description || 'Sem descrição adicional.'}
                            </p>
                        </div>

                        {/* Resumo do Lote */}
                        {project.is_batch && batchStats && (
                            <BatchSummaryCard
                                stats={batchStats}
                                deliveryMode={project.batch_delivery_mode || 'simultaneous'}
                            />
                        )}

                        {/* Lista de Vídeos (se lote) */}
                        {project.is_batch && project.batch_videos.length > 0 && (
                            <div className="bg-card border-2 border-border rounded-xl p-6">
                                <BatchVideosList
                                    videos={enrichedBatchVideos}
                                    deliveryMode={project.batch_delivery_mode}
                                    onReviewClick={handleReviewClick}
                                    onViewVideo={handleViewVideo}
                                />
                            </div>
                        )}

                        {/* Chat */}
                        <div className="bg-card border-2 border-border rounded-xl overflow-hidden h-[600px] flex flex-col">
                            <div className="p-4 border-b border-border bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-primary" />
                                    <h2 className="text-lg font-bold text-foreground">
                                        Chat com {project.editor_name || 'o Editor'}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <Chat projectId={project.id} isEmbedded={true} />
                            </div>
                        </div>
                    </div>

                    {/* =========================================
              SIDEBAR (1/3)
          ========================================= */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Card de Detalhes */}
                        <div className="bg-card border-2 border-border rounded-xl p-5 sticky top-24">
                            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-muted-foreground" />
                                Detalhes do Projeto
                            </h3>

                            <div className="space-y-4 text-sm">
                                {/* Status (Badge) */}
                                <div>
                                    <div className="text-muted-foreground mb-1">Status</div>
                                    {(() => {
                                        const status = project.is_batch && project.batch_videos
                                            ? calculateProjectStatus(project.batch_videos)
                                            : project.status;

                                        const config = {
                                            pending: { label: 'Aguardando', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: '⏳' },
                                            in_progress: { label: 'Em Progresso', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '🎬' },
                                            delivered: { label: 'Em Revisão', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '👀' }, // Mapped delivered to Em Revisão
                                            in_review: { label: 'Em Revisão', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: '👀' },
                                            revision: { label: 'Ajustes Solicitados', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🔄' },
                                            in_revision: { label: 'Ajustes Solicitados', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🔄' },
                                            completed: { label: 'Concluído', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: '✅' }
                                        }[status] || { label: 'Aguardando', className: 'bg-gray-100 text-gray-700', icon: '⏳' };

                                        return (
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>
                                                <span>{config.icon}</span>
                                                {config.label}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Tipo de Vídeo */}
                                <div>
                                    <div className="text-muted-foreground mb-1">Tipo de Vídeo</div>
                                    <div className="font-semibold text-foreground">
                                        {project.video_type === 'reels' ? '📱 Reels/Shorts' :
                                            project.video_type === 'youtube' ? '📹 YouTube' :
                                                project.video_type === 'motion' ? '🎨 Motion Graphics' :
                                                    project.video_type}
                                    </div>
                                </div>

                                {/* Estilo de Edição */}
                                <div>
                                    <div className="text-muted-foreground mb-1">Estilo de Edição</div>
                                    <div className="font-semibold text-foreground capitalize">
                                        {project.editing_style}
                                    </div>
                                </div>

                                {/* Duração */}
                                <div>
                                    <div className="text-muted-foreground mb-1">Duração</div>
                                    <div className="font-semibold text-foreground">
                                        {project.duration_category}
                                    </div>
                                </div>

                                {/* Info de Lote */}
                                {project.is_batch && (
                                    <>
                                        <div className="border-t border-border pt-4">
                                            <div className="text-muted-foreground mb-1">Modo de Entrega</div>
                                            <div className="font-semibold text-foreground">
                                                {project.batch_delivery_mode === 'sequential'
                                                    ? '📅 Sequencial (1 por vez)'
                                                    : '⚡ Simultâneo (todos juntos)'}
                                            </div>
                                        </div>

                                        {project.batch_discount_percent && project.batch_discount_percent > 0 && (
                                            <div>
                                                <div className="text-muted-foreground mb-1">Desconto Aplicado</div>
                                                <div className="font-semibold text-green-600 dark:text-green-400">
                                                    🎉 {project.batch_discount_percent}% OFF
                                                </div>
                                            </div>
                                        )}

                                        {batchStats && (
                                            <div className="bg-muted/50 rounded-lg p-3">
                                                <div className="text-muted-foreground text-xs mb-2">Progresso do Lote</div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-foreground font-medium">
                                                        {batchStats.approved} de {batchStats.total} aprovados
                                                    </span>
                                                    <span className="text-primary font-bold">
                                                        {batchStats.percentComplete}%
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all"
                                                        style={{ width: `${batchStats.percentComplete}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Financeiro */}
                                {(() => {
                                    const valueInfo = calculateProjectTotalValue(
                                        project.base_price,
                                        project.batch_quantity || 1,
                                        project.batch_discount_percent || 0
                                    );

                                    return (
                                        <div className="space-y-3">
                                            {/* Valor Total do Projeto */}
                                            <div className="border-t border-border pt-4">
                                                <div className="text-muted-foreground mb-1 flex items-center gap-1 text-sm">
                                                    <DollarSign className="w-3 h-3" />
                                                    Valor Total
                                                </div>
                                                <div className="text-2xl font-bold text-foreground">
                                                    R$ {valueInfo.totalAfterDiscount.toFixed(2).replace('.', ',')}
                                                </div>

                                                {/* Detalhamento para Lotes */}
                                                {project.is_batch && project.batch_quantity && project.batch_quantity > 1 && (
                                                    <div className="mt-2 space-y-1">
                                                        {/* Cálculo detalhado */}
                                                        <p className="text-xs text-muted-foreground">
                                                            {project.batch_quantity} vídeos × R$ {project.base_price.toFixed(2).replace('.', ',')}
                                                        </p>

                                                        {/* Desconto se aplicável */}
                                                        {project.batch_discount_percent && project.batch_discount_percent > 0 && (
                                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                                -{project.batch_discount_percent}% de desconto aplicado
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Valor por Vídeo (apenas para lotes) */}
                                            {project.is_batch && project.batch_quantity && project.batch_quantity > 1 && (
                                                <div className="bg-muted/30 rounded-lg p-3">
                                                    <div className="text-muted-foreground text-xs mb-1">Valor por Vídeo</div>
                                                    <div className="font-bold text-foreground">
                                                        R$ {valueInfo.pricePerVideo.toFixed(2).replace('.', ',')}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Pago ao Editor */}
                                            {project.is_batch && (
                                                <div>
                                                    <div className="text-muted-foreground text-xs mb-1">Pago ao Editor</div>
                                                    <div className="text-sm">
                                                        <span className="text-green-600 dark:text-green-400 font-medium">
                                                            R$ {(project.editor_earnings_released || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {' '}/ R$ {((project.editor_earnings_per_video * (project.batch_quantity || 1)) || 0).toFixed(2).replace('.', ',')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Prazo */}
                                <div>
                                    <div className="text-muted-foreground mb-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Prazo
                                    </div>
                                    <div className="font-semibold text-foreground">
                                        {new Date(project.deadline_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Material Fornecido */}
                        <ProjectMaterialCard
                            rawFootageUrl={project.raw_footage_url}
                            rawFootageDuration={project.raw_footage_duration}
                            brandIdentityUrl={project.brand_identity_url}
                            fontsUrl={project.fonts_url}
                            musicSfxUrl={project.music_sfx_url}
                            referenceLinks={project.reference_links}
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
