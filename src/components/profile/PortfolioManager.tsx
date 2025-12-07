import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus,
    Trash2,
    ExternalLink,
    Play,
    Loader2,
    GripVertical,
    Pencil,
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Video {
    id: string;
    video_url: string;
    video_type: string;
    title: string;
    description?: string;
    order_position: number;
}

interface PortfolioManagerProps {
    userId: string;
}

const VIDEO_TYPES = [
    { value: 'simple', label: 'Simples' },
    { value: 'dynamic', label: 'Dinâmica' },
    { value: 'motion', label: 'Motion Graphics' },
];

function PortfolioManager({ userId }: PortfolioManagerProps) {
    const { toast } = useToast();

    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newVideo, setNewVideo] = useState({
        url: '',
        type: 'simple',
        title: '',
        description: '',
    });

    const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);

    useEffect(() => {
        if (userId) {
            loadVideos();
        }
    }, [userId]);

    async function loadVideos() {
        try {
            const { data, error } = await supabase
                .from('portfolio_videos')
                .select('*')
                .eq('editor_id', userId)
                .order('order_position', { ascending: true });

            if (error) throw error;

            setVideos(data || []);
        } catch (error) {
            console.error('Error loading videos:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddVideo() {

        // === DEBUG LOGS ===
        console.log('========== DEBUG: handleAddVideo ==========');
        console.log('userId prop:', userId);
        console.log('newVideo state:', JSON.stringify(newVideo, null, 2));
        console.log('videos.length:', videos.length);
        // ==================

        // Validar limite de vídeos
        if (videos.length >= 3) {
            toast({
                variant: 'destructive',
                title: 'Limite atingido',
                description: 'Você pode ter no máximo 3 vídeos no portfólio. Remova um para adicionar outro.',
            });
            return;
        }

        if (!userId) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Usuário não identificado. Tente recarregar a página.',
            });
            return;
        }

        // Validar URL
        const url = newVideo.url.trim();
        if (!url) {
            toast({
                variant: 'destructive',
                title: 'URL obrigatória',
                description: 'Por favor, insira a URL do vídeo.',
            });
            return;
        }

        // Validar formato da URL (aceitar YouTube, Vimeo, Google Drive)
        const validUrlPatterns = [
            /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
            /^https?:\/\/(www\.)?vimeo\.com\/.+/i,
            /^https?:\/\/drive\.google\.com\/.+/i,
            /^https?:\/\/.+\.(mp4|mov|avi|webm)/i, // URLs diretas de vídeo
        ];

        const isValidUrl = validUrlPatterns.some(pattern => pattern.test(url));

        if (!isValidUrl) {
            toast({
                variant: 'destructive',
                title: 'URL inválida',
                description: 'Por favor, use uma URL válida do YouTube, Vimeo ou Google Drive.',
            });
            return;
        }

        setSaving(true);

        try {
            const nextPosition = videos.length + 1;
            const title = newVideo.title.trim() || `Vídeo ${nextPosition}`;

            const insertData = {
                editor_id: userId,
                video_url: url,
                video_type: newVideo.type,
                title: title,
                description: newVideo.description.trim() || null,
                order_position: nextPosition,
            };

            // === DEBUG LOG ===
            console.log('Dados para insert:', JSON.stringify(insertData, null, 2));
            // =================

            const { data, error } = await supabase
                .from('portfolio_videos')
                .insert(insertData)
                .select()
                .single();

            // === DEBUG LOGS ===
            console.log('Resposta do Supabase:');
            console.log('- data:', data);
            console.log('- error:', error);
            if (error) {
                console.error('ERRO DETALHADO:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                });
            }
            // ==================

            if (error) throw error;

            toast({
                title: 'Sucesso!',
                description: 'Vídeo adicionado ao portfólio.',
            });

            // Reset form
            setNewVideo({
                url: '',
                type: 'simple',
                title: '',
                description: '',
            });
            setShowAddForm(false);

            // Reload videos
            loadVideos();
        } catch (error: any) {
            console.error('CATCH ERROR:', error);

            let errorMessage = 'Erro ao adicionar vídeo. Tente novamente.';

            if (error.code === '23505') {
                errorMessage = 'Este vídeo já está no seu portfólio.';
            } else if (error.code === '42501') {
                errorMessage = 'Você não tem permissão para adicionar vídeos.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            toast({
                variant: 'destructive',
                title: 'Erro',
                description: errorMessage,
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteVideo() {
        if (!deleteVideoId) return;

        try {
            const { error } = await supabase
                .from('portfolio_videos')
                .delete()
                .eq('id', deleteVideoId);

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Vídeo removido do portfólio',
            });

            setDeleteVideoId(null);
            loadVideos();
        } catch (error) {
            console.error('Error deleting video:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao remover vídeo',
            });
        }
    }

    async function handleEditVideo() {

        if (!editingVideo) return;

        setSaving(true);

        try {
            const { error } = await supabase
                .from('portfolio_videos')
                .update({
                    title: editingVideo.title,
                    description: editingVideo.description || null,
                    video_type: editingVideo.video_type,
                })
                .eq('id', editingVideo.id);

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Vídeo atualizado!',
            });

            setEditingVideo(null);
            loadVideos();
        } catch (error: any) {
            console.error('Error updating video:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao atualizar vídeo',
            });
        } finally {
            setSaving(false);
        }
    }

    function getVideoTypeLabel(type: string) {
        return VIDEO_TYPES.find((t) => t.value === type)?.label || type;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Existing Videos */}
            {videos.length > 0 && (
                <div className="space-y-3">
                    {videos.map((video) => (
                        <div
                            key={video.id}
                            className="flex items-start gap-4 p-4 border border-border rounded-lg hover:border-primary transition-colors bg-card text-card-foreground"
                        >
                            {/* Drag Handle */}
                            <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1 cursor-move" />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-foreground">{video.title}</h4>
                                        {video.description && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {video.description}
                                            </p>
                                        )}
                                    </div>
                                    <Badge variant="secondary">
                                        {getVideoTypeLabel(video.video_type)}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-3">
                                    <a
                                        href={video.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                                    >
                                        <Play className="w-3 h-3" />
                                        Ver vídeo
                                        <ExternalLink className="w-3 h-3" />
                                    </a>

                                    <span className="text-sm text-muted-foreground">
                                        Posição {video.order_position}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {/* Botão Editar */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setEditingVideo(video);
                                    }}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>

                                {/* Botão Deletar */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setDeleteVideoId(video.id);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Video Button/Form */}
            {videos.length < 3 && (
                <>
                    {!showAddForm ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Vídeo ({videos.length}/3)
                        </Button>
                    ) : (
                        <div className="border border-primary rounded-lg p-4 bg-accent/10">
                            <h4 className="font-semibold text-foreground mb-4">
                                Novo Vídeo
                            </h4>

                            <div className="space-y-4">
                                {/* URL */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        URL do Vídeo *
                                    </label>
                                    <Input
                                        type="url"
                                        value={newVideo.url}
                                        onChange={(e) =>
                                            setNewVideo((prev) => ({ ...prev, url: e.target.value }))
                                        }
                                        placeholder="https://youtube.com/watch?v=..."
                                        required
                                    />
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Tipo *
                                    </label>
                                    <select
                                        value={newVideo.type}
                                        onChange={(e) =>
                                            setNewVideo((prev) => ({ ...prev, type: e.target.value }))
                                        }
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {VIDEO_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Título (opcional)
                                    </label>
                                    <Input
                                        type="text"
                                        value={newVideo.title}
                                        onChange={(e) =>
                                            setNewVideo((prev) => ({ ...prev, title: e.target.value }))
                                        }
                                        placeholder="Ex: Edição de vlog estilo dinâmico"
                                        maxLength={100}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Descrição (opcional)
                                    </label>
                                    <Textarea
                                        value={newVideo.description}
                                        onChange={(e) =>
                                            setNewVideo((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Breve descrição do trabalho..."
                                        rows={2}
                                        maxLength={200}
                                        className="resize-none"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleAddVideo}
                                        className="flex-1"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowAddForm(false)}
                                        disabled={saving}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {videos.length === 3 && (
                <p className="text-sm text-muted-foreground text-center">
                    Limite de 3 vídeos atingido. Remova um para adicionar outro.
                </p>
            )}

            {/* Dialog de Confirmação de Delete */}
            <AlertDialog open={!!deleteVideoId} onOpenChange={(open) => !open && setDeleteVideoId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover vídeo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este vídeo do seu portfólio?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteVideo}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog de Edição */}
            <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Vídeo</DialogTitle>
                    </DialogHeader>

                    {editingVideo && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">URL do Vídeo</label>
                                <Input
                                    value={editingVideo.video_url}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    A URL não pode ser alterada. Delete e adicione um novo vídeo se necessário.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo *</label>
                                <Select
                                    value={editingVideo.video_type}
                                    onValueChange={(value) => setEditingVideo({ ...editingVideo, video_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VIDEO_TYPES.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Título</label>
                                <Input
                                    value={editingVideo.title}
                                    onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                                    placeholder="Título do vídeo"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição (opcional)</label>
                                <Textarea
                                    value={editingVideo.description || ''}
                                    onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                                    placeholder="Breve descrição do trabalho..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingVideo(null)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="button" onClick={handleEditVideo} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default PortfolioManager;
