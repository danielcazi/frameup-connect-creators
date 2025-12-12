import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectHeader } from '@/components/project/ProjectHeader';
import { BatchVideosList } from '@/components/project/BatchVideosList';
import { ProjectMaterialCard } from '@/components/project/ProjectMaterialCard';
import { DeliveryForm } from '@/components/editor/DeliveryForm';
import { useProjectDetails, BatchVideo, getNextVideoToWork, getBatchStats } from '@/hooks/useProjectDetails';
import { Button } from '@/components/ui/button';
import {
    FileText,
    MessageSquare,
    AlertCircle,
    Loader2,
    ArrowLeft,
    DollarSign,
    TrendingUp,
    Upload,
    Zap
} from 'lucide-react';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export default function EditorProjectView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { project, loading, error, refresh } = useProjectDetails(id!);

    // Estado para vídeo selecionado para entrega
    const [selectedVideoForDelivery, setSelectedVideoForDelivery] = useState<BatchVideo | null>(null);

    // Próximo vídeo a trabalhar
    const nextVideoToWork = useMemo(() => {
        if (!project?.batch_videos) return null;
        return getNextVideoToWork(project.batch_videos);
    }, [project?.batch_videos]);

    // Stats do lote
    const batchStats = useMemo(() => {
        if (!project?.batch_videos) return null;
        return getBatchStats(project.batch_videos);
    }, [project?.batch_videos]);

    // Cálculos financeiros
    const financials = useMemo(() => {
        if (!project) return null;
        const total = project.editor_earnings_per_video * (project.batch_quantity || 1);
        const released = project.editor_earnings_released || 0;
        const pending = total - released;
        return { total, released, pending };
    }, [project]);

    // =====================================================
    // LOADING STATE
    // =====================================================
    if (loading) {
        return (
            <DashboardLayout>
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
    if (error || !project) {
        return (
            <DashboardLayout>
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
                    <Button onClick={() => navigate('/editor/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao Dashboard
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {/* Header do Projeto */}
            <ProjectHeader project={project} userRole="editor" />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* =========================================
              COLUNA PRINCIPAL (2/3)
          ========================================= */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Card: Próximo Vídeo para Trabalhar */}
                        {nextVideoToWork && !selectedVideoForDelivery && (
                            <div className={`border-2 rounded-xl p-5 ${nextVideoToWork.status === 'revision'
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                    : 'bg-gradient-to-br from-blue-50 to-primary/5 dark:from-blue-900/20 dark:to-primary/10 border-blue-200 dark:border-blue-800'
                                }`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${nextVideoToWork.status === 'revision'
                                            ? 'bg-orange-100 dark:bg-orange-900/30'
                                            : 'bg-blue-100 dark:bg-blue-900/30'
                                        }`}>
                                        {nextVideoToWork.status === 'revision' ? (
                                            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                        ) : (
                                            <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold mb-1 ${nextVideoToWork.status === 'revision'
                                                ? 'text-orange-900 dark:text-orange-100'
                                                : 'text-blue-900 dark:text-blue-100'
                                            }`}>
                                            {nextVideoToWork.status === 'revision'
                                                ? '🔄 Revisão Solicitada!'
                                                : '🎯 Próximo Vídeo para Entregar'}
                                        </h3>
                                        <p className={`text-sm mb-3 ${nextVideoToWork.status === 'revision'
                                                ? 'text-orange-700 dark:text-orange-300'
                                                : 'text-blue-700 dark:text-blue-300'
                                            }`}>
                                            <strong>#{nextVideoToWork.sequence_order}</strong> - {nextVideoToWork.title || `Vídeo ${nextVideoToWork.sequence_order}`}
                                        </p>

                                        {nextVideoToWork.specific_instructions && (
                                            <div className="bg-background/80 rounded-lg p-3 mb-3 text-sm text-foreground">
                                                <span className="font-medium">📝 Instruções:</span> {nextVideoToWork.specific_instructions}
                                            </div>
                                        )}

                                        <Button
                                            onClick={() => setSelectedVideoForDelivery(nextVideoToWork)}
                                            className={nextVideoToWork.status === 'revision'
                                                ? 'bg-orange-500 hover:bg-orange-600'
                                                : 'bg-blue-500 hover:bg-blue-600'
                                            }
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            {nextVideoToWork.status === 'revision' ? 'Enviar Correção' : 'Entregar Este Vídeo'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Formulário de Entrega */}
                        {selectedVideoForDelivery && (
                            <div className="bg-card border-2 border-border rounded-xl p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-foreground">
                                        📤 Entregar Vídeo #{selectedVideoForDelivery.sequence_order}
                                    </h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedVideoForDelivery(null)}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                                <DeliveryForm
                                    projectId={project.id}
                                    batchVideo={selectedVideoForDelivery}
                                    onSuccess={() => {
                                        refresh();
                                        setSelectedVideoForDelivery(null);
                                    }}
                                    onCancel={() => setSelectedVideoForDelivery(null)}
                                />
                            </div>
                        )}

                        {/* Descrição do Projeto */}
                        <div className="bg-card border-2 border-border rounded-xl p-6">
                            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Briefing do Cliente
                            </h2>
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                                {project.description || 'Sem descrição adicional.'}
                            </p>
                        </div>

                        {/* Lista de Vídeos (se lote) */}
                        {project.is_batch && project.batch_videos.length > 0 && (
                            <div className="bg-card border-2 border-border rounded-xl p-6">
                                <BatchVideosList
                                    videos={project.batch_videos}
                                    userRole="editor"
                                    deliveryMode={project.batch_delivery_mode}
                                    onVideoClick={(video) => console.log('Ver detalhes:', video)}
                                    onDeliverClick={(video) => setSelectedVideoForDelivery(video)}
                                />
                            </div>
                        )}

                        {/* Chat (Placeholder) */}
                        <div className="bg-card border-2 border-border rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-bold text-foreground">
                                    Chat com {project.creator_name}
                                </h2>
                            </div>
                            <div className="bg-muted/30 rounded-xl p-8 text-center">
                                <MessageSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                                <p className="text-muted-foreground text-sm">
                                    Sistema de chat em desenvolvimento...
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* =========================================
              SIDEBAR (1/3)
          ========================================= */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Card de Ganhos */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-5 sticky top-24">
                            <h3 className="font-bold text-green-900 dark:text-green-100 mb-4 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Seus Ganhos
                            </h3>

                            <div className="space-y-4">
                                {/* Liberado */}
                                <div>
                                    <div className="text-sm text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        Liberado
                                    </div>
                                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        R$ {financials?.released.toFixed(2) || '0,00'}
                                    </div>
                                </div>

                                {/* Por Vídeo */}
                                {project.is_batch && (
                                    <>
                                        <div className="border-t border-green-200 dark:border-green-800 pt-3">
                                            <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                                                Por vídeo aprovado
                                            </div>
                                            <div className="text-xl font-bold text-green-600 dark:text-green-400">
                                                R$ {project.editor_earnings_per_video.toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Pendente */}
                                        <div className="border-t border-green-200 dark:border-green-800 pt-3">
                                            <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                                                A receber
                                            </div>
                                            <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                                                R$ {financials?.pending.toFixed(2) || '0,00'}
                                            </div>
                                        </div>

                                        {/* Total Potencial */}
                                        <div className="border-t border-green-200 dark:border-green-800 pt-3">
                                            <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                                                Potencial total
                                            </div>
                                            <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                                                R$ {financials?.total.toFixed(2) || '0,00'}
                                            </div>
                                        </div>

                                        {/* Barra de Progresso */}
                                        {batchStats && (
                                            <div className="bg-white dark:bg-card/50 rounded-lg p-3 border border-green-200 dark:border-green-800">
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                    Progresso
                                                </div>
                                                <div className="flex items-center justify-between text-sm font-semibold mb-2">
                                                    <span className="text-foreground">
                                                        {batchStats.approved}/{batchStats.total} aprovados
                                                    </span>
                                                    <span className="text-green-600 dark:text-green-400">
                                                        {batchStats.percentComplete}%
                                                    </span>
                                                </div>
                                                <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                                        style={{ width: `${batchStats.percentComplete}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Material do Cliente */}
                        <ProjectMaterialCard
                            rawFootageUrl={project.raw_footage_url}
                            rawFootageDuration={project.raw_footage_duration}
                            brandIdentityUrl={project.brand_identity_url}
                            fontsUrl={project.fonts_url}
                            musicSfxUrl={project.music_sfx_url}
                            referenceLinks={project.reference_links}
                        />

                        {/* Info do Projeto */}
                        <div className="bg-card border-2 border-border rounded-xl p-5">
                            <h3 className="font-bold text-foreground mb-4">
                                ℹ️ Detalhes do Projeto
                            </h3>

                            <div className="space-y-3 text-sm">
                                <div>
                                    <div className="text-muted-foreground mb-1">Tipo de Vídeo</div>
                                    <div className="font-semibold text-foreground">
                                        {project.video_type === 'reels' ? '📱 Reels/Shorts' :
                                            project.video_type === 'youtube' ? '📹 YouTube' :
                                                project.video_type === 'motion' ? '🎨 Motion Graphics' :
                                                    project.video_type}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-muted-foreground mb-1">Estilo de Edição</div>
                                    <div className="font-semibold text-foreground capitalize">
                                        {project.editing_style}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-muted-foreground mb-1">Duração</div>
                                    <div className="font-semibold text-foreground">
                                        {project.duration_category}
                                    </div>
                                </div>

                                {project.is_batch && project.batch_delivery_mode && (
                                    <div>
                                        <div className="text-muted-foreground mb-1">Modo de Entrega</div>
                                        <div className="font-semibold text-foreground">
                                            {project.batch_delivery_mode === 'sequential'
                                                ? '📅 Sequencial'
                                                : '⚡ Simultâneo'}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {project.batch_delivery_mode === 'sequential'
                                                ? 'Entregue um vídeo por vez, aguarde aprovação'
                                                : 'Trabalhe em todos os vídeos simultaneamente'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
