import React, { useState, useRef, useEffect } from 'react';
import { Maximize, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoPlayerProps {
    url: string;
    videoType: 'youtube' | 'gdrive';
    onTimeUpdate?: (time: number) => void;
    seekTo?: number;
}

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

export function VideoPlayer({ url, videoType, onTimeUpdate, seekTo }: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Extrair ID do YouTube
    const getYouTubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return match && match[2].length === 11 ? match[2] : null;
    };

    const videoId = getYouTubeId(url);

    // Cleanup ao desmontar ou mudar vídeo
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }

            if (playerRef.current) {
                try {
                    if (typeof playerRef.current.destroy === 'function') {
                        playerRef.current.destroy();
                    }
                } catch (error) {
                    console.warn('Error destroying YouTube player:', error);
                }
                playerRef.current = null;
            }
        };
    }, [videoType, url]);

    // Inicializar YouTube Player
    useEffect(() => {
        if (videoType !== 'youtube' || !videoId) return;

        // Carregar API do YouTube
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        }

        const initPlayer = () => {
            const container = document.getElementById('youtube-player-frameup');
            if (!container) return;

            if (playerRef.current) {
                try {
                    if (typeof playerRef.current.destroy === 'function') {
                        playerRef.current.destroy();
                    }
                } catch (error) {
                    console.warn('Error destroying previous player:', error);
                }
                playerRef.current = null;
            }

            if (window.YT && window.YT.Player) {
                try {
                    playerRef.current = new window.YT.Player('youtube-player-frameup', {
                        videoId: videoId,
                        playerVars: {
                            autoplay: 0,
                            controls: 1,
                            modestbranding: 1,
                            rel: 0,
                        },
                        events: {
                            onReady: onPlayerReady,
                        },
                    });
                } catch (error) {
                    console.error('Error creating YouTube player:', error);
                }
            }
        };

        const timeoutId = setTimeout(() => {
            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                window.onYouTubeIframeAPIReady = initPlayer;
            }
        }, 100);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [videoId, videoType]);

    const onPlayerReady = () => {
        setIsReady(true);

        if (videoType === 'youtube') {
            intervalRef.current = setInterval(() => {
                if (playerRef.current && playerRef.current.getCurrentTime) {
                    const currentTime = playerRef.current.getCurrentTime();
                    onTimeUpdate?.(currentTime);
                }
            }, 500);
        }
    };

    // Seek para timestamp específico
    useEffect(() => {
        if (videoType === 'youtube' && seekTo !== undefined && playerRef.current && playerRef.current.seekTo) {
            playerRef.current.seekTo(seekTo, true);
        }
    }, [seekTo, videoType]);

    const toggleFullscreen = () => {
        if (containerRef.current) {
            if (!document.fullscreenElement) {
                containerRef.current.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    };

    // Render Google Drive
    if (videoType === 'gdrive') {
        return (
            <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
                <iframe
                    src={url}
                    className="w-full h-full"
                    allow="autoplay"
                    allowFullScreen
                />

                {/* Aviso de limitação */}
                <div className="absolute top-4 left-4">
                    <Alert className="bg-amber-500/90 border-amber-600 text-white py-2 px-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs font-medium ml-2">
                            Google Drive não suporta sincronização de tempo
                        </AlertDescription>
                    </Alert>
                </div>

                {/* Botão Fullscreen */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={toggleFullscreen}
                        className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                    >
                        <Maximize className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        );
    }

    // Render YouTube
    return (
        <div ref={containerRef} className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
            <div id="youtube-player-frameup" className="w-full h-full" />

            {/* Botão Fullscreen */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                >
                    <Maximize className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
