import { useState } from 'react';
import { Youtube, HardDrive, Play, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface VideoPreviewCardProps {
    url: string;
    className?: string;
}

// Detectar tipo de vídeo
function getVideoType(url: string): 'youtube' | 'gdrive' | null {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    }
    if (url.includes('drive.google.com')) {
        return 'gdrive';
    }
    return null;
}

// Extrair ID do YouTube
function getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// Gerar URL de thumbnail do YouTube
function getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

// Gerar URL de embed do YouTube
function getYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

// Converter URL do Google Drive para preview
function getGDrivePreviewUrl(url: string): string {
    const fileIdMatch = url.match(/\/d\/([^\/]+)/);
    if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    return url;
}

export function VideoPreviewCard({ url, className = '' }: VideoPreviewCardProps) {
    const [showModal, setShowModal] = useState(false);
    const videoType = getVideoType(url);

    if (!videoType) return null;

    const youtubeId = videoType === 'youtube' ? getYouTubeId(url) : null;

    return (
        <>
            {/* Preview Card */}
            <div className={`relative group rounded-lg overflow-hidden border-2 border-primary/20 bg-black ${className}`}>
                {/* Thumbnail ou placeholder */}
                {videoType === 'youtube' && youtubeId ? (
                    <img
                        src={getYouTubeThumbnail(youtubeId)}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <HardDrive className="w-12 h-12 text-gray-400" />
                    </div>
                )}

                {/* Overlay com botão de play */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                        type="button"
                        size="lg"
                        className="rounded-full w-14 h-14 bg-primary hover:bg-primary/90"
                        onClick={() => setShowModal(true)}
                    >
                        <Play className="w-6 h-6 fill-current" />
                    </Button>
                </div>

                {/* Badge do tipo de vídeo */}
                <div className="absolute top-2 left-2">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${videoType === 'youtube'
                            ? 'bg-red-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                        {videoType === 'youtube' ? (
                            <>
                                <Youtube className="w-3 h-3" />
                                YouTube
                            </>
                        ) : (
                            <>
                                <HardDrive className="w-3 h-3" />
                                Drive
                            </>
                        )}
                    </div>
                </div>

                {/* Link externo */}
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-md text-white hover:bg-black/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>

            {/* Modal de Player */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle className="flex items-center gap-2">
                            {videoType === 'youtube' ? (
                                <>
                                    <Youtube className="w-5 h-5 text-red-600" />
                                    Vídeo de Portfólio
                                </>
                            ) : (
                                <>
                                    <HardDrive className="w-5 h-5 text-blue-600" />
                                    Vídeo de Portfólio
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="aspect-video bg-black">
                        {videoType === 'youtube' && youtubeId ? (
                            <iframe
                                src={getYouTubeEmbedUrl(youtubeId)}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <iframe
                                src={getGDrivePreviewUrl(url)}
                                className="w-full h-full"
                                allow="autoplay"
                                allowFullScreen
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default VideoPreviewCard;
