import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
    Video,
    Users
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { VideoPreviewCard } from '@/components/shared/VideoPreviewCard';
import { Star, MapPin, Clock } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
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
    const userRole = 'creator';





    // Próximo vídeo a revisar
    const nextVideoToReview = useMemo(() => {
        // 1. Batch Logic
        if (project?.is_batch && project.batch_videos) {
            return getNextVideoToReview(project.batch_videos);
        }

        // 2. Single Project Logic
        // Se não é lote e está em revisão, retorna um objeto compatível com BatchVideo
        if (!project?.is_batch && (project?.status === 'in_review' || project?.status === 'delivered')) {
            // Encontrar a entrega mais recente 'pending_review'
            // Nota: project.deliveries já vem ordenado por versão descendente no hook
            const pendingDelivery = project.deliveries.find(d => d.status === 'pending_review');

            if (pendingDelivery) {
                return {
                    id: project.id, // Using project ID as ID
                    project_id: project.id,
                    sequence_order: 1,
                    title: project.title,
                    status: 'delivered', // To match helper expectation if check
                    revision_count: project.revision_count || 0,
                    paid_extra_revisions: false, // TODO: Implement for single
                    specific_instructions: null,
                    editor_can_choose_timing: false,
                    selected_timestamp_start: null,
                    selected_timestamp_end: null,
                    delivery_id: pendingDelivery.id,
                    approved_at: null,
                    payment_released_at: null,
                    payment_amount: 0,
                    created_at: '',
                    updated_at: ''
                } as BatchVideo;
            }
        }

        return null;
    }, [project, project?.batch_videos, project?.deliveries]);

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

    // Auto-scroll para a seção de lote
    useEffect(() => {
        if (project?.is_batch && !loading) {
            // Pequeno delay para garantir renderização
            setTimeout(() => {
                const element = document.getElementById('batch-videos-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [project?.id, loading, project?.is_batch]);

    // Objeto de projeto modificado para exibição no Header
    const displayProject = useMemo(() => {
        if (!project) return null;
        return {
            ...project,
            status: derivedStatus,
            videos_approved: batchStats?.approved || 0,
            batch_stats_counts: batchStats ? {
                approved: batchStats.approved,
                delivered: batchStats.awaitingReview + batchStats.inRevision,
                in_progress: batchStats.inProgress
            } : undefined
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
        console.log('[ProjectView] Attempting to review video:', {
            videoId: video.id,
            status: video.status,
            availableDeliveries: project.deliveries.length,
            deliveryIds: project.deliveries.map(d => ({ id: d.id, batch_vid: d.batch_video_id }))
        });

        // Find the LATEST delivery for this video
        // Para Single Project, batch_video_id é null, então buscamos a delivery relacionada ao video (que é o fake object)
        const delivery = project.is_batch
            ? project.deliveries.find(d => d.batch_video_id === video.id)
            : project.deliveries.find(d => d.status === 'pending_review'); // Para single, pega a pendente

        if (delivery) {
            console.log('[ProjectView] Delivery found:', delivery.id);
            // Navigate to the full revision page with video ID context
            const queryParams = project.is_batch ? `?video=${video.id}` : '';
            navigate(`/project/${project.id}/revision/${delivery.version}${queryParams}`);
        } else {
            // Tentar fallback: Buscar via Supabase diretamente
            // Isso resolve casos onde o hook useProjectDetails ainda não atualizou a lista de entregas
            // mas o batch_video já está com status 'delivered'
            console.log('[ProjectView] Local delivery not found, trying fetch...');

            supabase
                .from('project_deliveries')
                .select('id, version, project_id')
                .eq('project_id', project.id)
                .eq(project.is_batch ? 'batch_video_id' : 'status', project.is_batch ? video.id : 'pending_review')
                .order('version', { ascending: false })
                .limit(1)
                .single()
                .then(({ data: fetchedDelivery, error }) => {
                    if (fetchedDelivery && !error) {
                        console.log('[ProjectView] Delivery found via fetch:', fetchedDelivery.id);
                        const queryParams = project.is_batch ? `?video=${video.id}` : '';
                        navigate(`/project/${project.id}/revision/${fetchedDelivery.version}${queryParams}`);
                    } else {
                        console.error('[ProjectView] Direct fetch failed:', error);
                        alert(`Debug Error: Delivery record not found for video ${video.sequence_order} neither locally nor in DB.`);
                    }
                });
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

                        {/* 🆕 Alerta: Candidaturas Pendentes */}
                        {project.status === 'open' && !project.editor_name && (project.current_applications > 0) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1">
                                            🎉 {project.current_applications} {project.current_applications === 1 ? 'Candidatura' : 'Candidaturas'} Recebida{project.current_applications !== 1 && 's'}!
                                        </h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                                            Editores se candidataram ao seu projeto. Analise os perfis e escolha o melhor profissional.
                                        </p>
                                        <Button
                                            onClick={() => navigate(`/creator/project/${project.id}/applications`)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Ver Candidaturas
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alerta: Vídeo para Revisar */}
                        {nextVideoToReview && (
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





                        {/* =========================================
                            STAGE 1: PRE-SELECTION (Sem Editor)
                            Mostrar lista de candidaturas recentes
                        ========================================= */}
                        {!project.editor_name && (
                            <div className="space-y-6 mb-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                        <Users className="w-6 h-6 text-primary" />
                                        Candidaturas Recentes ({project.recent_applications?.length || 0}/5)
                                    </h2>
                                    {project.current_applications > 0 && (
                                        <Button variant="outline" onClick={() => navigate(`/creator/project/${project.id}/applications`)}>
                                            Ver Todas
                                        </Button>
                                    )}
                                </div>

                                {project.recent_applications && project.recent_applications.length > 0 ? (
                                    <div className="space-y-4">
                                        {project.recent_applications.map((app) => (
                                            <Card key={app.id} className="overflow-hidden">
                                                <CardContent className="p-0">
                                                    <div className="flex flex-col md:flex-row">
                                                        {/* Editor Info */}
                                                        <div className="p-6 flex-1">
                                                            <div className="flex items-start gap-4">
                                                                <Avatar className="w-12 h-12">
                                                                    <AvatarImage src={app.editor.profile_photo_url} />
                                                                    <AvatarFallback>{app.editor.full_name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <h3 className="font-bold text-lg">{app.editor.full_name}</h3>
                                                                        {app.editor.editor_profiles && (
                                                                            <Badge variant="secondary" className="flex items-center gap-1">
                                                                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                                                {Array.isArray(app.editor.editor_profiles)
                                                                                    ? app.editor.editor_profiles[0]?.rating_average?.toFixed(1)
                                                                                    : app.editor.editor_profiles.rating_average?.toFixed(1)
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                                                                        {app.message}
                                                                    </p>

                                                                    {/* Video Preview */}
                                                                    {app.portfolio_video_url && (
                                                                        <div className="mb-4">
                                                                            <span className="text-xs font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                                                                                <Video className="w-3 h-3" /> Vídeo de Portfólio
                                                                            </span>
                                                                            <VideoPreviewCard url={app.portfolio_video_url} className="h-40 w-full max-w-sm" />
                                                                        </div>
                                                                    )}

                                                                    <Button size="sm" onClick={() => navigate(`/creator/project/${project.id}/applications`)}>
                                                                        Ver Detalhes da Proposta
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-card border-2 border-border rounded-xl p-8 text-center">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">Aguardando Candidaturas</h3>
                                        <p className="text-muted-foreground max-w-md mx-auto">
                                            Seu projeto está visível para nossos editores. Assim que recebermos propostas, elas aparecerão aqui.
                                        </p>
                                    </div>
                                )}
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
                            <div id="batch-videos-section" className="scroll-mt-72">
                                <BatchSummaryCard
                                    stats={batchStats}
                                    deliveryMode={project.batch_delivery_mode || 'simultaneous'}
                                />
                            </div>
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



                        {/* =========================================
                            STAGE 2: POST-SELECTION (Com Editor)
                            Mostrar Chat
                        ========================================= */}
                        {project.editor_name && (
                            /* Chat or Blocked Message */
                            /* Chat becomes read-only after the first delivery is made */
                            (project.deliveries && project.deliveries.length > 0) ? (
                                <div className="bg-card border-2 border-orange-200 dark:border-orange-800 rounded-xl overflow-hidden h-[600px] flex flex-col relative">
                                    <div className="p-4 border-b border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                            <h2 className="text-lg font-bold text-foreground">
                                                Chat com {project.editor_name || 'o Editor'}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden relative">
                                        <Chat projectId={project.id} isEmbedded={true} readOnly={true} />

                                        {/* Overlay com botão de ação (opcional, mas bom para context) */}
                                        <div className="absolute inset-x-0 bottom-0 bg-background/95 backdrop-blur-sm border-t border-orange-200 p-4 flex items-center justify-between">
                                            <div className="text-sm text-muted-foreground">
                                                <span className="font-medium text-orange-600">Fase de Revisão</span> • O chat está em modo leitura.
                                            </div>
                                            {project.deliveries.some(d => d.status === 'pending_review') && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const pendingDelivery = project.deliveries.find(d => d.status === 'pending_review');
                                                        if (pendingDelivery) {
                                                            navigate(`/project/${project.id}/revision/${pendingDelivery.version}`);
                                                        }
                                                    }}
                                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                                >
                                                    Ir para Revisão
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
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
                            )
                        )}
                    </div>

                    {/* =========================================
              SIDEBAR (1/3)
          ========================================= */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Card de Detalhes */}
                        <div className="bg-card border-2 border-border rounded-xl p-5">
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
