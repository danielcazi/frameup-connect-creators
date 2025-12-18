import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Upload, Link as LinkIcon, AlertCircle, Loader2, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DeliveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    videoType: string;
    batchVideoId?: string | null;
    currentVersion: number;
    onSuccess: () => void;
    project?: any; // Passar o projeto completo para ter acesso aos batch_videos
}

const DeliveryModal = ({
    isOpen,
    onClose,
    projectId,
    videoType,
    batchVideoId,
    currentVersion,
    onSuccess,
    project
}: DeliveryModalProps) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [videoUrl, setVideoUrl] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedBatchVideoId, setSelectedBatchVideoId] = useState<string | null>(batchVideoId || null);
    const [nextVersion, setNextVersion] = useState<number>(1);
    const [calculatingVersion, setCalculatingVersion] = useState(false);

    // Atualizar vídeo selecionado quando prop mudar
    useEffect(() => {
        setSelectedBatchVideoId(batchVideoId || null);
    }, [batchVideoId, isOpen]);

    // Calcular a próxima versão sempre que o vídeo selecionado mudar
    useEffect(() => {
        const fetchNextVersion = async () => {
            if (!isOpen) return;

            setCalculatingVersion(true);
            try {
                let count = 0;

                if (selectedBatchVideoId) {
                    // Contar entregas para este vídeo específico
                    const { count: c, error } = await supabase
                        .from('project_deliveries')
                        .select('*', { count: 'exact', head: true })
                        .eq('batch_video_id', selectedBatchVideoId);

                    if (!error) count = c || 0;
                } else if (project?.is_batch) {
                    // Se é projeto em lote mas nenhum vídeo selecionado, resetar ou assumir 1
                    // (O usuário DEVE selecionar um vídeo)
                    count = 0;
                } else {
                    // Projeto normal (não lote)
                    const { count: c, error } = await supabase
                        .from('project_deliveries')
                        .select('*', { count: 'exact', head: true })
                        .eq('project_id', projectId)
                        .is('batch_video_id', null);

                    if (!error) count = c || 0;
                }

                setNextVersion(count + 1);
            } catch (err) {
                console.error("Erro ao calcular versão:", err);
            } finally {
                setCalculatingVersion(false);
            }
        };

        fetchNextVersion();
    }, [selectedBatchVideoId, projectId, project?.is_batch, isOpen]);

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleSubmit = async () => {
        // Validações
        if (!videoUrl.trim()) {
            setError('Por favor, insira o link do vídeo.');
            return;
        }

        if (!isValidUrl(videoUrl)) {
            setError('Por favor, insira um link válido.');
            return;
        }

        if (!user) {
            setError('Você precisa estar logado para entregar.');
            return;
        }

        // Em projeto de lote, OBRIGAR a selecionar um vídeo
        if (project?.is_batch && !selectedBatchVideoId) {
            setError('Por favor, selecione qual vídeo do lote você está entregando.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Usar a versão calculada pelo useEffect
            const version = nextVersion;

            // ═══════════════════════════════════════════════════════════════════
            // CRIAR ENTREGA NA TABELA project_deliveries
            // ═══════════════════════════════════════════════════════════════════

            // Detectar tipo de vídeo (plataforma) baseado na URL
            const getVideoPlatform = (url: string) => {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    return 'youtube';
                }
                return 'gdrive'; // Default para gdrive/outros conforme constraint
            };

            const deliveryData: any = {
                project_id: projectId,
                editor_id: user.id,
                video_url: videoUrl.trim(),
                description: description.trim() || null,
                version: version,
                video_type: getVideoPlatform(videoUrl.trim()),
                status: 'pending_review',
                submitted_at: new Date().toISOString(),
            };

            // Adicionar batch_video_id se for entrega de vídeo específico
            if (selectedBatchVideoId) {
                deliveryData.batch_video_id = selectedBatchVideoId;
            }

            const { data: delivery, error: deliveryError } = await supabase
                .from('project_deliveries')
                .insert(deliveryData)
                .select()
                .single();

            if (deliveryError) throw deliveryError;

            // ═══════════════════════════════════════════════════════════════════
            // ATUALIZAR STATUS DO PROJETO OU BATCH_VIDEO
            // ═══════════════════════════════════════════════════════════════════
            if (selectedBatchVideoId) {
                // Atualizar o batch_video específico
                const { error: batchVideoError } = await supabase
                    .from('batch_videos')
                    .update({
                        status: 'delivered',
                        delivery_id: delivery.id,
                        delivery_url: videoUrl.trim(),
                        revision_count: version
                    })
                    .eq('id', selectedBatchVideoId);

                if (batchVideoError) {
                    console.error('Error updating batch_video:', batchVideoError);
                }
            } else {
                // Atualizar o projeto principal (projeto único, não-lote)
                const { error: projectError } = await supabase
                    .from('projects')
                    .update({ status: 'delivered' })
                    .eq('id', projectId);

                if (projectError) {
                    console.error('Error updating project:', projectError);
                }
            }

            // ═══════════════════════════════════════════════════════════════════
            // CRIAR NOTIFICAÇÃO PARA O CREATOR
            // ═══════════════════════════════════════════════════════════════════
            const { data: projectData } = await supabase
                .from('projects')
                .select('creator_id, title')
                .eq('id', projectId)
                .single();

            if (projectData?.creator_id) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: projectData.creator_id,
                        type: 'delivery_received',
                        title: 'Nova entrega recebida!',
                        message: selectedBatchVideoId
                            ? `O editor entregou um vídeo do lote "${projectData.title}". Revise agora!`
                            : `O editor entregou o projeto "${projectData.title}". Revise agora!`,
                        data: {
                            project_id: projectId,
                            delivery_id: delivery.id,
                            batch_video_id: selectedBatchVideoId || null
                        }
                    });
            }

            // Limpar e fechar
            setVideoUrl('');
            setDescription('');
            onSuccess();

        } catch (err) {
            console.error('Error submitting delivery:', err);
            setError('Erro ao enviar entrega. Tente novamente.');
            toast({
                title: "Erro ao entregar",
                description: "Não foi possível enviar sua entrega. Tente novamente.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setVideoUrl('');
            setDescription('');
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Entregar Vídeo
                    </DialogTitle>
                    <DialogDescription>
                        Envie o link do vídeo editado para revisão do creator.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* SELEÇÃO DO VÍDEO NO LOTE (Se for projeto em lote) */}
                    {project?.is_batch && (
                        <div className="space-y-2">
                            <Label>Qual vídeo você está entregando?</Label>
                            <Select
                                value={selectedBatchVideoId || ''}
                                onValueChange={setSelectedBatchVideoId}
                                disabled={!!batchVideoId} // Travar se já veio selecionado da tela anterior
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o vídeo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {project.batch_videos?.map((video: any) => (
                                        <SelectItem key={video.id} value={video.id}>
                                            Vídeo {video.sequence_order}: {video.title} ({video.status === 'completed' ? 'Concluído' : video.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Indicador de vídeo específico (se já veio fixo) */}
                    {!project?.is_batch && batchVideoId && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                                Entregando vídeo específico do lote
                            </span>
                        </div>
                    )}

                    {/* Versão - Calculada automaticamente */}
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={calculatingVersion ? "opacity-50" : ""}>
                            {calculatingVersion ? (
                                <span className="flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Calculando...</span>
                            ) : (
                                `Versão ${nextVersion}`
                            )}
                        </Badge>
                        {nextVersion > 1 && !calculatingVersion && (
                            <span className="text-xs text-muted-foreground">
                                (Revisão da versão {nextVersion - 1})
                            </span>
                        )}
                    </div>

                    {/* Campo de URL */}
                    <div className="space-y-2">
                        <Label htmlFor="videoUrl">Link do Vídeo *</Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                id="videoUrl"
                                placeholder="https://drive.google.com/file/..."
                                value={videoUrl}
                                onChange={(e) => {
                                    setVideoUrl(e.target.value);
                                    setError(null);
                                }}
                                className="pl-10"
                                disabled={isSubmitting}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Cole o link do Google Drive, Dropbox, YouTube ou outra plataforma
                        </p>
                    </div>

                    {/* Campo de Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Notas (opcional)</Label>
                        <Textarea
                            id="description"
                            placeholder="Descreva o que foi feito nesta versão..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !videoUrl.trim() || calculatingVersion || (project?.is_batch && !selectedBatchVideoId)}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Entregar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeliveryModal;
