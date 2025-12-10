import PortfolioDisplay from '@/components/profile/PortfolioDisplay';
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
    RefreshCw,
} from 'lucide-react';
import FavoriteButton from '@/components/favorites/FavoriteButton';

interface PortfolioVideo {
    id: string;
    video_url: string;
    video_type: string;
    title: string;
    description?: string;
    order_position: number;
}

interface EditorProfileData {
    user_id: string;
    bio: string;
    city: string;
    state: string;
    specialties: string[];
    software_skills: string[];
    rating_average: number;
    total_projects: number;
    total_reviews: number;
    full_name: string;
    username: string;
    profile_photo_url?: string;
    portfolio_videos: PortfolioVideo[];
}

function EditorPublicProfile() {
    const { username } = useParams();
    const { user, userType } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<EditorProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasWorkedTogether, setHasWorkedTogether] = useState(false);

    const isOwnProfile = user && profile && user.id === profile.user_id;

    // Verificar se usuário tem permissão (apenas creator e admin)
    useEffect(() => {
        if (userType === 'editor') {
            // Editores não podem ver perfis de outros editores
            // Mas se for o próprio perfil (via /editor/profile/meu_username), talvez devesse permitir?
            // O prompt 29.3 pediu restrição total por enquanto, mantendo comportamento.
            navigate('/editor/dashboard');
        }
    }, [userType, navigate]);

    useEffect(() => {
        if (username) {
            loadProfile();
        }
    }, [username]);

    async function loadProfile() {
        try {
            setLoading(true);

            // Remover @ do username se houver
            const cleanUsername = username?.replace('@', '');

            // 1. Buscar dados do usuário e editor_profiles
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select(`
                    id,
                    full_name,
                    username,
                    profile_photo_url,
                    editor_profiles (
                        bio,
                        city,
                        state,
                        specialties,
                        software_skills,
                        rating_average,
                        total_projects,
                        total_reviews
                    )
                `)
                .eq('username', cleanUsername)
                .eq('user_type', 'editor')
                .maybeSingle();

            if (userError) {
                console.error('Error fetching user:', userError);
                throw userError;
            }

            if (!userData) {
                console.log('User not found:', cleanUsername);
                setProfile(null);
                setLoading(false);
                return;
            }

            // 2. Buscar portfólio separadamente usando o user_id
            const { data: portfolioData, error: portfolioError } = await supabase
                .from('portfolio_videos')
                .select('id, video_url, video_type, title, description, order_position')
                .eq('editor_id', userData.id)
                .order('order_position', { ascending: true });

            if (portfolioError) {
                console.error('Error fetching portfolio:', portfolioError);
                // Não falhar se portfólio der erro, apenas continuar sem vídeos
            }

            // 3. Processar editor_profiles (pode ser array ou objeto)
            const editorProfileData = Array.isArray(userData.editor_profiles)
                ? userData.editor_profiles[0]
                : userData.editor_profiles;

            // 4. Montar o objeto de perfil
            const transformedProfile: EditorProfileData = {
                user_id: userData.id,
                full_name: userData.full_name || '',
                username: userData.username || '',
                profile_photo_url: userData.profile_photo_url,
                bio: editorProfileData?.bio || '',
                city: editorProfileData?.city || '',
                state: editorProfileData?.state || '',
                specialties: editorProfileData?.specialties || [],
                software_skills: editorProfileData?.software_skills || [],
                rating_average: editorProfileData?.rating_average || 0,
                total_projects: editorProfileData?.total_projects || 0,
                total_reviews: editorProfileData?.total_reviews || 0,
                portfolio_videos: portfolioData || [],
            };

            setProfile(transformedProfile);

            // 5. Verificar se já trabalhou com este editor (se usuário é creator)
            if (user && userType === 'creator') {
                const { count } = await supabase
                    .from('projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', user.id)
                    .eq('assigned_editor_id', userData.id)
                    .eq('status', 'completed');

                setHasWorkedTogether((count || 0) > 0);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            setProfile(null);
        } finally {
            setLoading(false);
        }
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
            subtitle={profile.full_name}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Avatar */}
                            <Avatar className="w-32 h-32 mx-auto md:mx-0 border-4 border-background shadow-lg">
                                <AvatarImage src={profile.profile_photo_url} alt={profile.full_name} />
                                <AvatarFallback className="text-4xl">
                                    {profile.full_name?.charAt(0) || '?'}
                                </AvatarFallback>
                            </Avatar>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-foreground mb-2">
                                    {profile.full_name}
                                </h1>
                                <p className="text-lg text-muted-foreground mb-4">
                                    @{profile.username}
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
                                        {hasWorkedTogether && (
                                            <Button
                                                onClick={() => navigate('/creator/project/new', {
                                                    state: { rehireEditorId: profile.user_id }
                                                })}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Recontratar
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/creator/dashboard')}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            Ver Projetos
                                        </Button>
                                        <FavoriteButton
                                            editorId={profile.user_id}
                                            editorName={profile.full_name}
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
                {profile.specialties && profile.specialties.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Briefcase className="w-5 h-5" />
                                Especialidades
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.specialties.map((specialty) => (
                                    <Badge key={specialty} variant="default" className="text-base px-3 py-1">
                                        {specialty}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Software Skills */}
                {profile.software_skills && profile.software_skills.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                Softwares
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {profile.software_skills.map((software) => (
                                    <Badge key={software} variant="secondary" className="text-base px-3 py-1">
                                        {software}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Portfolio */}
                {profile.portfolio_videos && profile.portfolio_videos.length > 0 && (
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                                <Play className="w-5 h-5" />
                                Portfólio ({profile.portfolio_videos.length})
                            </h3>
                            <PortfolioDisplay videos={profile.portfolio_videos} />
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
