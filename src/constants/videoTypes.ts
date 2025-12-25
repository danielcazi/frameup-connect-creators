/**
 * @fileoverview Tipos e utilitários para plataformas de vídeo
 */

export const VIDEO_PLATFORM = {
    YOUTUBE: 'youtube',
    GOOGLE_DRIVE: 'gdrive',
    DROPBOX: 'dropbox',
    VIMEO: 'vimeo',
    UNKNOWN: 'unknown',
} as const;

export type VideoPlatform = typeof VIDEO_PLATFORM[keyof typeof VIDEO_PLATFORM];

export interface VideoUrlValidation {
    platform: VideoPlatform | null;
    url: string;
    isValid: boolean;
    error?: string;
    videoId?: string;
}

export function convertGoogleDriveUrl(url: string): string {
    const fileIdMatch = url.match(/\/d\/([^\/]+)/);
    if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    return url;
}

export function getYouTubeVideoId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

export function detectVideoType(url: string): VideoUrlValidation {
    if (!url || typeof url !== 'string') {
        return { platform: null, url: '', isValid: false, error: 'URL não fornecida' };
    }

    const trimmedUrl = url.trim();

    try {
        new URL(trimmedUrl);
    } catch {
        return { platform: null, url: trimmedUrl, isValid: false, error: 'URL inválida' };
    }

    // YouTube
    if (trimmedUrl.includes('youtube.com') || trimmedUrl.includes('youtu.be')) {
        const videoId = getYouTubeVideoId(trimmedUrl);
        return { platform: VIDEO_PLATFORM.YOUTUBE, url: trimmedUrl, isValid: true, videoId: videoId || undefined };
    }

    // Google Drive - Pasta (não permitido)
    if (trimmedUrl.includes('drive.google.com/folders/')) {
        return { platform: null, url: trimmedUrl, isValid: false, error: 'Use o link de um arquivo de vídeo, não de uma pasta' };
    }

    // Google Drive - Arquivo
    if (trimmedUrl.includes('drive.google.com')) {
        const fileIdMatch = trimmedUrl.match(/\/d\/([^\/]+)/);
        if (fileIdMatch) {
            return { platform: VIDEO_PLATFORM.GOOGLE_DRIVE, url: convertGoogleDriveUrl(trimmedUrl), isValid: true, videoId: fileIdMatch[1] };
        }
        return { platform: null, url: trimmedUrl, isValid: false, error: 'Link do Google Drive inválido' };
    }

    // Vimeo
    if (trimmedUrl.includes('vimeo.com')) {
        const match = trimmedUrl.match(/vimeo\.com\/(\d+)/);
        return { platform: VIDEO_PLATFORM.VIMEO, url: trimmedUrl, isValid: true, videoId: match?.[1] };
    }

    // Dropbox
    if (trimmedUrl.includes('dropbox.com')) {
        return { platform: VIDEO_PLATFORM.DROPBOX, url: trimmedUrl, isValid: true };
    }

    return { platform: VIDEO_PLATFORM.UNKNOWN, url: trimmedUrl, isValid: false, error: 'URL não suportada. Use YouTube, Google Drive, Vimeo ou Dropbox.' };
}

export function getVideoPlatform(url: string): VideoPlatform {
    const validation = detectVideoType(url);
    return validation.platform || VIDEO_PLATFORM.GOOGLE_DRIVE;
}

export function isValidVideoUrl(url: string): boolean {
    return detectVideoType(url).isValid;
}
