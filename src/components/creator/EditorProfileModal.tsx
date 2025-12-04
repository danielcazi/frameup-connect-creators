import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    Star,
    Briefcase,
    MapPin,
    Code,
    ExternalLink,
    CheckCircle,
    XCircle,
    Loader2,
    Play,
    Award,
} from 'lucide-react';

interface Application {
    id: string;
    message: string;
    editor: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
        editor_profiles: {
            bio: string;
            city: string;
            state: string;
            specialties: string[];
            software_skills: string[];
            rating_average: number;
            total_projects: number;
            total_reviews: number;
        };
    };
}

interface PortfolioVideo {
    id: string;
    url: string;
    type: string;
    title: string;
    description?: string;
    order_position: number;
}

interface EditorProfileModalProps {
    application: Application;
    projectId: string;
    onClose: () => void;
    onAccept: (applicationId: string, editorId: string) => void;
    onReject: (applicationId: string) => void;
}

function EditorProfileModal({
    application,
    projectId,
    onClose,
    onAccept,
    onReject,
}: EditorProfileModalProps) {
    const { toast } = useToast();
    const [portfolioVideos, setPortfolioVideos] = useState<PortfolioVideo[]>([]);
    const [loadingPortfolio, setLoadingPortfolio] = useState(true);
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);

    const { editor } = application;
    const profile = editor.editor_profiles;

    useEffect(() => {
        loadPortfolio();
    }, []);

    async function loadPortfolio() {
        try {
            const { data, error } = await supabase
                .from('portfolio_videos')
                .select('*')
                .eq('editor_id', editor.id)
                .order('order_position', { ascending: true });

            if (error) throw error;

            setPortfolioVideos(data || []);
        } catch (error) {
            console.error('Error loading portfolio:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar portfólio',
            });
        } finally {
            setLoadingPortfolio(false);
        }
    }

    function getVideoEmbedUrl(url: string): string {
        // YouTube
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.includes('youtu.be')
                ? url.split('youtu.be/')[1]?.split('?')[0]
                : new URL(url).searchParams.get('v');
            return `https://www.youtube.com/embed/${videoId}`;
        }

        // Vimeo
        if (url.includes('vimeo.com')) {
            const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
            return `https://player.vimeo.com/video/${videoId}`;
        }

        return url;
    }

    const videoTypeLabels: Record<string, string> = {
        simple: 'Simples',
        dynamic: 'Dinâmica',
        motion: 'Motion Graphics',
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Perfil do Editor</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 pb-6 border-b border-border">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={editor.profile_photo_url} alt={editor.full_name} />
                            <AvatarFallback className="text-2xl">{editor.full_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-foreground mb-1">
                                {editor.full_name}
                            </h2>
                            <p className="text-muted-foreground mb-3">@{editor.username}</p>

                            {/* Stats */}
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    <span className="text-lg font-semibold">
                                        {profile?.rating_average?.toFixed(1) || '0.0'}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        ({profile?.total_reviews || 0} avaliações)
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Briefcase className="w-5 h-5" />
                                    <span className="font-medium">{profile?.total_projects || 0}</span>
                                    <span className="text-sm">projetos concluídos</span>
                                </div>

                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="w-5 h-5" />
                                    <span className="text-sm">
                                        {profile?.city || 'N/A'}, {profile?.state || ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    {profile?.bio && (
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3">Sobre</h3>
                            <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
                        </div>
                    )}

                    {/* Specialties */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3">
                            Especialidades
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile?.specialties?.map((specialty) => (
                                <Badge key={specialty} variant="default">
                                    {specialty}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Software Skills */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            Softwares
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile?.software_skills?.map((software) => (
                                <Badge key={software} variant="secondary">
                                    {software}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Portfolio */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Play className="w-5 h-5" />
                            Portfólio ({portfolioVideos.length})
                        </h3>

                        {loadingPortfolio ? (
                            <div className="flex items-center justify-center py-12 bg-muted/30 rounded-lg border">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : portfolioVideos.length > 0 ? (
                            <div className="space-y-4">
                                {/* Main Video Player */}
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border">
                                    <iframe
                                        src={getVideoEmbedUrl(portfolioVideos[activeVideoIndex].url)}
                                        title={portfolioVideos[activeVideoIndex].title}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>

                                {/* Video Info */}
                                <div className="bg-muted/30 rounded-lg p-4 border">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-foreground mb-1">
                                                {portfolioVideos[activeVideoIndex].title}
                                            </h4>
                                            {portfolioVideos[activeVideoIndex].description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {portfolioVideos[activeVideoIndex].description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="default">
                                            {videoTypeLabels[portfolioVideos[activeVideoIndex].type] || portfolioVideos[activeVideoIndex].type}
                                        </Badge>
                                    </div>

                                    <a
                                        href={portfolioVideos[activeVideoIndex].url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                    >
                                        Assistir no site original
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                {/* Video Thumbnails */}
                                {portfolioVideos.length > 1 && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {portfolioVideos.map((video, index) => (
                                            <button
                                                key={video.id}
                                                onClick={() => setActiveVideoIndex(index)}
                                                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${index === activeVideoIndex
                                                    ? 'border-primary shadow-md'
                                                    : 'border-border hover:border-muted-foreground'
                                                    }`}
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white" />
                                                </div>
                                                <span className="absolute bottom-2 left-2 text-xs font-medium text-white">
                                                    Vídeo {video.order_position}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-muted/30 rounded-lg border">
                                <Play className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground">Este editor ainda não adicionou vídeos ao portfólio</p>
                            </div>
                        )}
                    </div>

                    {/* Application Message */}
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-3">
                            Mensagem de Candidatura
                        </h3>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <p className="text-foreground leading-relaxed whitespace-pre-line">
                                {application.message}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-6 border-t border-border">
                        <Button
                            variant="outline"
                            size="lg"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Fechar
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => onReject(application.id)}
                        >
                            <XCircle className="w-5 h-5 mr-2" />
                            Rejeitar
                        </Button>

                        <Button
                            size="lg"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => onAccept(application.id, editor.id)}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Selecionar Editor
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default EditorProfileModal;
