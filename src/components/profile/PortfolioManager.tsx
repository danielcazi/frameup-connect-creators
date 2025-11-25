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
} from 'lucide-react';

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

    async function handleAddVideo(e: React.FormEvent) {
        e.preventDefault();

        if (videos.length >= 3) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Máximo de 3 vídeos no portfólio',
            });
            return;
        }

        // Validar URL
        if (!newVideo.url.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'URL do vídeo é obrigatória',
            });
            return;
        }

        if (!newVideo.url.match(/^https?:\/\/.+/)) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'URL inválida',
            });
            return;
        }

        setSaving(true);

        try {
            const nextPosition = videos.length + 1;

            const { error } = await supabase.from('portfolio_videos').insert({
                editor_id: userId,
                video_url: newVideo.url.trim(),
                video_type: newVideo.type,
                title: newVideo.title.trim() || 'Vídeo ' + nextPosition,
                description: newVideo.description.trim() || null,
                order_position: nextPosition,
            });

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Vídeo adicionado ao portfólio!',
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
            console.error('Error adding video:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao adicionar vídeo',
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteVideo(videoId: string) {
        // In a real app, use a custom dialog. For now, window.confirm is fine as per user code.
        if (!window.confirm('Tem certeza que deseja remover este vídeo?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('portfolio_videos')
                .delete()
                .eq('id', videoId);

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Vídeo removido',
            });

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

                            {/* Delete Button */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteVideo(video.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
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
                        <form onSubmit={handleAddVideo} className="border border-primary rounded-lg p-4 bg-accent/10">
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
                                        type="submit"
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
                        </form>
                    )}
                </>
            )}

            {videos.length === 3 && (
                <p className="text-sm text-muted-foreground text-center">
                    Limite de 3 vídeos atingido. Remova um para adicionar outro.
                </p>
            )}
        </div>
    );
}

export default PortfolioManager;
