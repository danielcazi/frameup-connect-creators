import { useState } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Package,
    ChevronDown,
    ChevronUp,
    FileText,
    Image,
    Music,
    ExternalLink,
    User,
    Calendar,
    DollarSign,
    Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { EditorProject } from '@/hooks/useEditorProjects';
import { Button } from '@/components/ui/button';

// =====================================================
// INTERFACES
// =====================================================
interface ProposalCardProps {
    project: EditorProject;
    onUpdate: () => void;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function ProposalCard({ project, onUpdate }: ProposalCardProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showVideos, setShowVideos] = useState(false);

    // Calcular ganhos totais
    const totalEarnings = project.is_batch
        ? (project.editor_earnings_per_video || 0) * (project.batch_quantity || 1)
        : project.base_price * 0.85; // 85% (15% é taxa da plataforma)

    // Calcular dias até o prazo
    const deadlineDays = project.deadline
        ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    // =====================================================
    // ACEITAR PROPOSTA
    // =====================================================
    const handleAccept = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Não autenticado');

            // 1. Atualizar status do projeto
            const { error: projectError } = await supabase
                .from('projects')
                .update({
                    status: 'in_progress',
                    assigned_editor_id: user.id,
                    accepted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', project.id);

            if (projectError) throw projectError;

            // 2. Se for lote, atualizar status dos batch_videos
            if (project.is_batch && project.batch_videos && project.batch_videos.length > 0) {
                if (project.batch_delivery_mode === 'sequential') {
                    // Modo Sequencial: apenas o primeiro vídeo vai para in_progress
                    const { error: batchError } = await supabase
                        .from('batch_videos')
                        .update({
                            status: 'in_progress',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('project_id', project.id)
                        .eq('sequence_order', 1);

                    if (batchError) throw batchError;
                } else {
                    // Modo Simultâneo: todos os vídeos vão para in_progress
                    const { error: batchError } = await supabase
                        .from('batch_videos')
                        .update({
                            status: 'in_progress',
                            updated_at: new Date().toISOString(),
                        })
                        .eq('project_id', project.id);

                    if (batchError) throw batchError;
                }
            }

            toast({
                title: '✅ Proposta aceita!',
                description: project.is_batch
                    ? `Você tem ${project.batch_quantity} vídeos para entregar. Bom trabalho!`
                    : 'Você pode começar a trabalhar no projeto agora.',
            });

            onUpdate();

        } catch (error: any) {
            console.error('Erro ao aceitar proposta:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao aceitar',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // RECUSAR PROPOSTA
    // =====================================================
    const handleDecline = async () => {
        if (!confirm('Tem certeza que deseja recusar esta proposta?')) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    status: 'cancelled',
                    rehire_editor_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', project.id);

            if (error) throw error;

            toast({
                title: 'Proposta recusada',
                description: 'O cliente será notificado.',
            });

            onUpdate();

        } catch (error: any) {
            console.error('Erro ao recusar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-2 border-primary/30 rounded-xl bg-gradient-to-br from-primary/5 to-background overflow-hidden shadow-lg">

            {/* =====================================================
          HEADER COM INFO DO CLIENTE
      ===================================================== */}
            <div className="bg-primary text-primary-foreground p-4">
                <div className="flex items-center gap-3 mb-3">
                    {project.creator_photo ? (
                        <img
                            src={project.creator_photo}
                            alt={project.creator_name}
                            className="w-12 h-12 rounded-full border-2 border-primary-foreground/30 object-cover"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="text-sm opacity-80">Nova Proposta de</div>
                        <div className="font-semibold text-lg truncate">{project.creator_name}</div>
                    </div>

                    {/* Badge de Lote */}
                    {project.is_batch && (
                        <div className="shrink-0 flex items-center gap-1.5 bg-primary-foreground/20 px-3 py-1.5 rounded-full text-sm font-medium">
                            <Package className="w-4 h-4" />
                            Lote • {project.batch_quantity} vídeos
                        </div>
                    )}
                </div>

                {/* Mensagem de recontratação */}
                {project.rehire_message && (
                    <div className="bg-primary-foreground/10 rounded-lg p-3 text-sm">
                        <div className="opacity-80 text-xs mb-1">Mensagem do cliente:</div>
                        <div className="italic">"{project.rehire_message}"</div>
                    </div>
                )}
            </div>

            {/* =====================================================
          CONTEÚDO PRINCIPAL
      ===================================================== */}
            <div className="p-5 space-y-4">

                {/* Título e Descrição */}
                <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                        {project.title}
                    </h3>
                    <p className="text-muted-foreground text-sm line-clamp-3">
                        {project.description}
                    </p>
                </div>

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Tipo</div>
                        <div className="font-semibold text-sm text-foreground">
                            {project.video_type === 'reels' ? '📱 Reels/Shorts' :
                                project.video_type === 'youtube' ? '📹 YouTube' : '🎨 Motion'}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Estilo</div>
                        <div className="font-semibold text-sm text-foreground capitalize">
                            {project.editing_style === 'lofi' ? '📺 Lo-fi' :
                                project.editing_style === 'dynamic' ? '⚡ Dinâmico' :
                                    project.editing_style === 'pro' ? '🎬 PRO' :
                                        project.editing_style === 'motion' ? '🎨 Motion' : project.editing_style}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Duração</div>
                        <div className="font-semibold text-sm text-foreground">
                            {project.duration || 'Não especificado'}
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Prazo
                        </div>
                        <div className={`font-semibold text-sm ${deadlineDays < 3 ? 'text-destructive' : 'text-foreground'}`}>
                            {deadlineDays > 0 ? `${deadlineDays} dias` : 'Urgente!'}
                        </div>
                    </div>
                </div>

                {/* Modo de Entrega (se lote) */}
                {project.is_batch && (
                    <div className={`rounded-lg p-4 border-2 ${project.batch_delivery_mode === 'simultaneous'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        }`}>
                        <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                            {project.batch_delivery_mode === 'simultaneous' ? (
                                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                            <span className={project.batch_delivery_mode === 'simultaneous' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}>
                                MODO DE ENTREGA
                            </span>
                        </div>
                        <div className="text-sm text-foreground">
                            {project.batch_delivery_mode === 'sequential' ? (
                                <>
                                    📅 <strong>Sequencial:</strong> Entregue 1 vídeo por vez. Após aprovação, o próximo é liberado.
                                </>
                            ) : (
                                <>
                                    ⚡ <strong>Simultâneo:</strong> Entregue todos os {project.batch_quantity} vídeos juntos no prazo final.
                                    <span className="ml-2 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-medium">
                                        +20% no valor
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Card de Ganhos */}
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Você vai receber:
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                            R$ {totalEarnings.toFixed(2)}
                        </span>
                    </div>
                    {project.is_batch && project.editor_earnings_per_video && (
                        <div className="text-xs text-muted-foreground">
                            R$ {project.editor_earnings_per_video.toFixed(2)} por vídeo aprovado
                            {project.batch_discount_percent && project.batch_discount_percent > 0 && (
                                <span className="ml-2 text-green-600">
                                    (cliente pagou com {project.batch_discount_percent}% de desconto)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* =====================================================
            MATERIAL FORNECIDO (Expansível)
        ===================================================== */}
                <div className="border-t border-border pt-4">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-foreground hover:text-primary transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            📦 Material Fornecido pelo Cliente
                        </span>
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {expanded && (
                        <div className="mt-4 space-y-2">
                            {/* Material Bruto */}
                            {project.raw_footage_url && (
                                <a
                                    href={project.raw_footage_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                                >
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground">Material Bruto</div>
                                        <div className="text-xs text-muted-foreground">
                                            {project.raw_footage_duration || 'Clique para acessar'}
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                </a>
                            )}

                            {/* Identidade Visual */}
                            {project.brand_identity_url && (
                                <a
                                    href={project.brand_identity_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                                >
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                        <Image className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground">Identidade Visual</div>
                                        <div className="text-xs text-muted-foreground">Logo, cores, templates</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                </a>
                            )}

                            {/* Fontes */}
                            {project.fonts_url && (
                                <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                        <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground">Fontes</div>
                                        <div className="text-xs text-muted-foreground truncate">{project.fonts_url}</div>
                                    </div>
                                </div>
                            )}

                            {/* Música/SFX */}
                            {project.music_sfx_url && (
                                <a
                                    href={project.music_sfx_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors group"
                                >
                                    <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                                        <Music className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-foreground">Música/SFX</div>
                                        <div className="text-xs text-muted-foreground">Clique para acessar</div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                </a>
                            )}

                            {/* Referências */}
                            {project.reference_links && (
                                <div className="p-3 bg-card border border-border rounded-lg">
                                    <div className="font-medium text-sm text-foreground mb-2">🔗 Links de Referência</div>
                                    <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        {project.reference_links}
                                    </div>
                                </div>
                            )}

                            {/* Aviso se não tiver material */}
                            {!project.raw_footage_url && !project.brand_identity_url && !project.fonts_url && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    O cliente ainda não forneceu materiais.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* =====================================================
            LISTA DE VÍDEOS DO LOTE (Expansível)
        ===================================================== */}
                {project.is_batch && project.batch_videos && project.batch_videos.length > 0 && (
                    <div className="border-t border-border pt-4">
                        <button
                            onClick={() => setShowVideos(!showVideos)}
                            className="w-full flex items-center justify-between text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                📋 Vídeos Solicitados ({project.batch_videos.length})
                            </span>
                            {showVideos ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showVideos && (
                            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                                {project.batch_videos.map((video) => (
                                    <div
                                        key={video.id || video.sequence_order}
                                        className="bg-card border border-border rounded-lg p-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                                {video.sequence_order}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-foreground">
                                                    {video.title || `Vídeo #${video.sequence_order}`}
                                                </div>

                                                {video.specific_instructions && (
                                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {video.specific_instructions}
                                                    </div>
                                                )}

                                                {video.editor_can_choose_timing && (
                                                    <div className="text-xs text-primary mt-1 flex items-center gap-1 font-medium">
                                                        ✨ Você escolhe a minutagem
                                                    </div>
                                                )}

                                                {video.selected_timestamp_start !== null && video.selected_timestamp_end !== null && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        ⏱️ Usar de {Math.floor(video.selected_timestamp_start / 60)}min até {Math.floor(video.selected_timestamp_end / 60)}min
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* =====================================================
            BOTÕES DE AÇÃO
        ===================================================== */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                        onClick={handleAccept}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="lg"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                Aceitar Projeto
                            </span>
                        )}
                    </Button>

                    <Button
                        onClick={handleDecline}
                        disabled={loading}
                        variant="outline"
                        size="lg"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    >
                        <XCircle className="w-5 h-5 mr-2" />
                        Recusar
                    </Button>
                </div>
            </div>
        </div>
    );
}
