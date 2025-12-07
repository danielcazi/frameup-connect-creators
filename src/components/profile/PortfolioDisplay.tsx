import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioVideo {
  id: string;
  title: string;
  video_url: string;
  video_type: string;
  description?: string;
  order_position: number;
}

interface PortfolioDisplayProps {
  videos: PortfolioVideo[];
  className?: string;
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  simple: 'Simples',
  dynamic: 'Dinâmica',
  motion: 'Motion Graphics',
};

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/v\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0];
    }
  }

  return null;
}

function getVimeoVideoId(url: string): string | null {
  if (!url) return null;
  const pattern = /vimeo\.com\/(\d+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

function PortfolioDisplay({ videos, className }: PortfolioDisplayProps) {
  const [selectedVideo, setSelectedVideo] = useState<PortfolioVideo | null>(null);

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum vídeo no portfólio ainda</p>
      </div>
    );
  }

  const getEmbedUrl = (url: string): string => {
    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    }

    const vimeoId = getVimeoVideoId(url);
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }

    return url;
  };

  const getThumbnail = (url: string): string | null => {
    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      return getYouTubeThumbnail(youtubeId);
    }
    return null;
  };

  return (
    <>
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {videos.map((video) => {
          const thumbnail = getThumbnail(video.video_url);

          return (
            <div
              key={video.id}
              className="relative group cursor-pointer overflow-hidden rounded-xl bg-muted aspect-video"
              onClick={() => setSelectedVideo(video)}
            >
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Play className="w-12 h-12 text-white/50" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 shadow-lg opacity-90 group-hover:opacity-100">
                  <Play className="w-6 h-6 text-white ml-1" fill="white" />
                </div>
              </div>

              <Badge
                variant="secondary"
                className="absolute top-2 right-2 bg-black/60 text-white border-none text-xs"
              >
                {VIDEO_TYPE_LABELS[video.video_type] || video.video_type}
              </Badge>

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-medium truncate">{video.title}</p>
                {video.description && (
                  <p className="text-white/70 text-xs truncate mt-0.5">{video.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-black border-none overflow-hidden">
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <h3 className="text-white font-medium truncate max-w-md">
                {selectedVideo?.title}
              </h3>
              {selectedVideo && (
                <Badge variant="secondary" className="bg-white/20 text-white border-none">
                  {VIDEO_TYPE_LABELS[selectedVideo.video_type] || selectedVideo.video_type}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={() => window.open(selectedVideo?.video_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={() => setSelectedVideo(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {selectedVideo && (
              <iframe
                src={getEmbedUrl(selectedVideo.video_url)}
                title={selectedVideo.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                frameBorder="0"
              />
            )}
          </div>

          {selectedVideo?.description && (
            <div className="p-4 bg-black/90 border-t border-white/10">
              <p className="text-white/80 text-sm">{selectedVideo.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PortfolioDisplay;
