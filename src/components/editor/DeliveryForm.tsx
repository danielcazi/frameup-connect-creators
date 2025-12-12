import { useState } from 'react';
import { Upload, AlertCircle, Link as LinkIcon, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deliverBatchVideo } from '@/services/batchDeliveryService';
import { BatchVideo } from '@/hooks/useEditorProjects';

// =====================================================
// INTERFACES
// =====================================================
interface DeliveryFormProps {
    projectId: string;
    batchVideo: BatchVideo;
    onSuccess: () => void;
    onCancel?: () => void;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function DeliveryForm({
    projectId,
    batchVideo,
    onSuccess,
    onCancel
}: DeliveryFormProps) {
    const { toast } = useToast();
    const [videoUrl, setVideoUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [urlError, setUrlError] = useState('');

    // Validar URL
    const validateUrl = (url: string): boolean => {
        if (!url.trim()) {
            setUrlError('URL é obrigatória');
            return false;
        }

        try {
            const parsed = new URL(url);
            const validDomains = [
                'drive.google.com',
                'docs.google.com',
                'vimeo.com',
                'youtube.com',
                'youtu.be',
                'wetransfer.com',
                'we.tl',
                'dropbox.com',
                'onedrive.live.com',
                'mega.nz',
                'mediafire.com'
            ];

            const isValid = validDomains.some(domain => parsed.hostname.includes(domain));

            if (!isValid) {
                setUrlError('Use links do Google Drive, Vimeo, YouTube, WeTransfer, Dropbox ou similar');
                return false;
            }

            setUrlError('');
            return true;
        } catch {
            setUrlError('URL inválida');
            return false;
        }
    };

    // Submeter entrega
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateUrl(videoUrl)) {
            return;
        }

        setSubmitting(true);

        try {
            const result = await deliverBatchVideo({
                projectId,
                batchVideoId: batchVideo.id,
                videoUrl: videoUrl.trim(),
                deliveryNotes: notes.trim() || undefined,
            });

            if (result.success) {
                toast({
                    title: '✅ Vídeo entregue com sucesso!',
                    description: 'O cliente foi notificado e vai revisar seu trabalho.',
                });
                onSuccess();
            } else {
                throw new Error(result.error || 'Erro ao entregar');
            }
        } catch (error: any) {
            console.error('Erro ao entregar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao entregar vídeo',
                description: error.message || 'Tente novamente.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const isRevision = batchVideo.status === 'revision';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* Header com Info do Vídeo */}
            <div className={`rounded-xl p-5 border-2 ${isRevision
                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    : 'bg-primary/5 border-primary/20'
                }`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isRevision
                            ? 'bg-orange-100 dark:bg-orange-900/50'
                            : 'bg-primary/10'
                        }`}>
                        {isRevision ? (
                            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        ) : (
                            <Upload className="w-6 h-6 text-primary" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h3 className={`font-bold text-lg ${isRevision
                                ? 'text-orange-900 dark:text-orange-100'
                                : 'text-foreground'
                            }`}>
                            {isRevision ? '🔄 Entregar Revisão' : '📤 Entregar Vídeo'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">
                                #{batchVideo.sequence_order} - {batchVideo.title || `Vídeo ${batchVideo.sequence_order}`}
                            </span>
                        </p>

                        {isRevision && batchVideo.revision_count > 0 && (
                            <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                                Esta é a revisão #{batchVideo.revision_count + 1}
                            </div>
                        )}
                    </div>
                </div>

                {/* Instruções específicas do vídeo */}
                {batchVideo.specific_instructions && (
                    <div className="mt-4 p-3 bg-background/80 rounded-lg border border-border">
                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
                            <FileText className="w-3 h-3" />
                            Instruções do Cliente
                        </div>
                        <p className="text-sm text-foreground">
                            {batchVideo.specific_instructions}
                        </p>
                    </div>
                )}

                {/* Minutagem solicitada */}
                {batchVideo.selected_timestamp_start !== null && batchVideo.selected_timestamp_end !== null && (
                    <div className="mt-3 text-sm text-muted-foreground">
                        ⏱️ Minutagem: {Math.floor(batchVideo.selected_timestamp_start / 60)}min
                        até {Math.floor(batchVideo.selected_timestamp_end / 60)}min
                    </div>
                )}

                {/* Editor pode escolher */}
                {batchVideo.editor_can_choose_timing && (
                    <div className="mt-3 text-sm text-primary font-medium">
                        ✨ Você pode escolher a minutagem deste vídeo
                    </div>
                )}
            </div>

            {/* Campo URL do Vídeo */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <LinkIcon className="w-4 h-4" />
                    Link do Vídeo *
                </label>
                <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => {
                        setVideoUrl(e.target.value);
                        if (urlError) validateUrl(e.target.value);
                    }}
                    onBlur={() => videoUrl && validateUrl(videoUrl)}
                    placeholder="https://drive.google.com/file/d/... ou https://vimeo.com/..."
                    required
                    className={`w-full px-4 py-3 border-2 rounded-lg bg-background transition-colors ${urlError
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : 'border-input focus:border-primary focus:ring-primary/20'
                        } focus:ring-2`}
                />
                {urlError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {urlError}
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Aceitos: Google Drive, Vimeo, YouTube, WeTransfer, Dropbox, OneDrive
                    </p>
                )}
            </div>

            {/* Campo Notas de Entrega */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                    Notas de Entrega (Opcional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Descreva as escolhas criativas que você fez, efeitos especiais usados, músicas escolhidas, etc..."
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    💡 Notas ajudam o cliente a entender suas decisões criativas
                </p>
            </div>

            {/* Alerta sobre Revisões */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Sobre revisões:</strong> O cliente tem direito a 2 revisões gratuitas por vídeo.
                    A partir da 3ª revisão, ele precisará pagar +20% do valor do vídeo.
                </div>
            </div>

            {/* Checklist antes de enviar */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold text-foreground mb-2">
                    ✅ Verifique antes de enviar:
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    <input type="checkbox" className="accent-primary" />
                    O link está público ou com permissão de visualização
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    <input type="checkbox" className="accent-primary" />
                    Revisei o vídeo antes de enviar
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                    <input type="checkbox" className="accent-primary" />
                    Segui todas as instruções do cliente
                </label>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={submitting}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={submitting || !videoUrl.trim()}
                    className={`flex-1 ${isRevision
                            ? 'bg-orange-500 hover:bg-orange-600'
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white font-semibold`}
                >
                    {submitting ? (
                        <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Enviando...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            {isRevision ? <AlertCircle className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                            {isRevision ? 'Enviar Revisão' : 'Entregar Vídeo'}
                        </span>
                    )}
                </Button>
            </div>
        </form>
    );
}
