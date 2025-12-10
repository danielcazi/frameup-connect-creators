declare namespace YT {
    interface Player {
        playVideo(): void;
        pauseVideo(): void;
        stopVideo(): void;
        seekTo(seconds: number, allowSeekAhead: boolean): void;
        getCurrentTime(): number;
        getDuration(): number;
        getPlayerState(): number;
        destroy(): void;
    }

    interface PlayerEvent {
        target: Player;
        data: number;
    }

    interface OnErrorEvent {
        target: Player;
        data: number;
    }

    interface PlayerOptions {
        videoId?: string;
        width?: string | number;
        height?: string | number;
        playerVars?: {
            autoplay?: 0 | 1;
            controls?: 0 | 1;
            modestbranding?: 0 | 1;
            rel?: 0 | 1;
            fs?: 0 | 1;
            playsinline?: 0 | 1;
        };
        events?: {
            onReady?: (event: PlayerEvent) => void;
            onError?: (event: OnErrorEvent) => void;
            onStateChange?: (event: PlayerEvent) => void;
        };
    }

    class Player {
        constructor(elementId: string | HTMLElement, options: PlayerOptions);
    }
}

interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
}
