import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RatingDisplay } from '@/components/ui/RatingStars';
import ReviewsList from '@/components/editor/ReviewsList';
import {
    MapPin,
    Briefcase,
    Code,
    Play,
    ExternalLink,
    Loader2,
    Edit,
    MessageSquare,
} from 'lucide-react';
import FavoriteButton from '@/components/favorites/FavoriteButton';

interface EditorProfile {
    user_id: string;
    bio: string;
    city: string;
    state: string;
    specialties: string[];
    software_skills: string[];
    rating_average: number;
    total_projects: number;
    total_reviews: number;
    users: {
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    portfolio_videos: Array<{
        id: string;
        video_url: string;
        video_type: string;
        title: string;
        description?: string;
        order_position: number;
    }>;
}

function EditorPublicProfile() {
    const { username } = useParams();
    const { user, userType } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<EditorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeVideoIndex, setActiveVideoIndex] = useState(0);

    const isOwnProfile = user && profile && user.id === profile.user_id;

    useEffect(() => {
        if (username) {
            loadProfile();
        }
    }, [username]);

    async function loadProfile() {
        try {
            // Remover @ do username se houver
            const cleanUsername = username?.replace('@', '');

            // Buscar usuário pelo username
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('username', cleanUsername)
                .single();

            if (userError) throw userError;

            // Buscar perfil completo
            const { data, error } = await supabase
                .from('editor_profiles')
                .select(`
          *,
          users!editor_profiles_user_id_fkey (
            full_name,
            username,
            profile_photo_url
          ),
          portfolio_videos (
            id,
            video_url,
            video_type,
            title,
            description,
            order_position
          )
        `)
                .eq('user_id', userData.id)
                .single();

            if (error) throw error;

            // Ordenar vídeos
            if (data.portfolio_videos) {
                data.portfolio_videos.sort((a: any, b: any) => a.order_position - b.order_position);
            }

            setProfile(data);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    function getVideoEmbedUrl(url: string): string {
        try {
            // YouTube
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                let videoId = '';
                if (url.includes('youtu.be')) {
                    videoId = url.split('youtu.be/')[1]?.split('?')[0];
                } else {
                    const urlObj = new URL(url);
                    videoId = urlObj.searchParams.get('v') || '';
                }
                return `https://www.youtube.com/embed/${videoId}`;
            }

            // Vimeo
            if (url.includes('vimeo.com')) {
                const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
                return `https://player.vimeo.com/video/${videoId}`;
            }
        } catch (e) {
            console.error('Error parsing video URL', e);
        }

        return url;
    }

    if (loading) {
        return (
            <DashboardLayout
                userType={userType as any}
                title="Perfil"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!profile) {
        return (
            <DashboardLayout
                userType={userType as any}
                title="Perfil não encontrado"
                subtitle="Este editor não existe"
            >
                <Card className="text-center p-8">
                    <p className="text-muted-foreground mb-4">Editor não encontrado</p>
                    <Button
                        variant="secondary"
                        onClick={() => navigate(-1)}
                    >
                        Voltar
                    </Button>
                </Card>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType={userType as any}
            title="Perfil do Editor"
            subtitle={profile.users.full_name}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar */}
                            <Avatar className="w-32 h-32 mx-auto md:mx-0 border-4 border-background shadow-lg">
                                <AvatarImage src={profile.users.profile_photo_url} alt={profile.users.full_name} />
                                <AvatarFallback className="text-4xl">
                                    {profile.users.full_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-foreground mb-2">
                                    {profile.users.full_name}
                                </h1>
                                <p className="text-lg text-muted-foreground mb-4">
                                    @{profile.users.username}
                                </p>

                                {/* Stats */}
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4">
                                    <RatingDisplay
                                        rating={profile.rating_average}
                                        totalReviews={profile.total_reviews}
                                        size="medium"
                                    />

                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Briefcase className="w-5 h-5" />
                                        <span className="font-medium">{profile.total_projects}</span>
                                        <span className="text-sm">projetos</span>
                                    </div>

                                    {profile.city && profile.state && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <MapPin className="w-5 h-5" />
                                            <span className="text-sm">
                                                {profile.city}, {profile.state}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                {isOwnProfile ? (
                                    <Button
                                        onClick={() => navigate('/editor/profile/edit')}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar Perfil
                                    </Button>
                                ) : userType === 'creator' && (
                                    <div className="flex items-center gap-3">
                                        <Button
                                            onClick={() => navigate('/creator/dashboard')}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Ver Projetos
                                        </Button>
                                        <FavoriteButton
                                            editorId={profile.user_id}
                                            editorName={profile.users.full_name}
                                            size="lg"
                                            showLabel
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <h3 className="text-lg font-semibold text-foreground mb-3">Sobre</h3>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                    {profile.bio}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Specialties */}
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5" />
                            Especialidades
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.specialties?.map((specialty) => (
                                <Badge key={specialty} variant="default" className="text-base px-3 py-1">
                                    {specialty}
                                </Badge>
                            ))}
                            {(!profile.specialties || profile.specialties.length === 0) && (
                                <p className="text-muted-foreground">Nenhuma especialidade listada.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Software Skills */}
                <Card>
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Code className="w-5 h-5" />
                            Softwares
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.software_skills?.map((software) => (
                                <Badge key={software} variant="secondary" className="text-base px-3 py-1">
                                    {software}
                                </Badge>
                            ))}
                            {(!profile.software_skills || profile.software_skills.length === 0) && (
                                <p className="text-muted-foreground">Nenhum software listado.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Portfolio */}
                {profile.portfolio_videos && profile.portfolio_videos.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                                <Play className="w-5 h-5" />
                                Portfólio ({profile.portfolio_videos.length})
                            </h3>

                            <div className="space-y-4">
                                {/* Main Video Player */}
                                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                    <iframe
                                        src={getVideoEmbedUrl(profile.portfolio_videos[activeVideoIndex].video_url)}
                                        title={profile.portfolio_videos[activeVideoIndex].title}
                                        className="w-full h-full"
                                        allowFullScreen
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    />
                                </div>

                                {/* Video Info */}
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-foreground mb-1">
                                                {profile.portfolio_videos[activeVideoIndex].title}
                                            </h4>
                                            {profile.portfolio_videos[activeVideoIndex].description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {profile.portfolio_videos[activeVideoIndex].description}
                                                </p>
                                            )}
                                        </div>
                                        <Badge variant="outline">
                                            {profile.portfolio_videos[activeVideoIndex].video_type}
                                        </Badge>
                                    </div>

                                    <a
                                        href={profile.portfolio_videos[activeVideoIndex].video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                                    >
                                        Assistir no site original
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>

                                {/* Video Thumbnails */}
                                {profile.portfolio_videos.length > 1 && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {profile.portfolio_videos.map((video, index) => (
                                            <button
                                                key={video.id}
                                                onClick={() => setActiveVideoIndex(index)}
                                                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${index === activeVideoIndex
                                                    ? 'border-primary shadow-md'
                                                    : 'border-transparent hover:border-muted-foreground/50'
                                                    }`}
                                            >
                                                <div className="absolute inset-0 bg-black/20" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Play className="w-8 h-8 text-white opacity-80" />
                                                </div>
                                                <span className="absolute bottom-1 left-2 text-[10px] font-medium text-white bg-black/50 px-1 rounded">
                                                    Vídeo {video.order_position}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Reviews */}
                <ReviewsList editorId={profile.user_id} showSummary={true} />
            </div>
        </DashboardLayout>
    );
}

export default EditorPublicProfile;
