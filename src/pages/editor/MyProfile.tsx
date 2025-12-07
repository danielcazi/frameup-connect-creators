import PortfolioDisplay from '@/components/profile/PortfolioDisplay';
import { useSubscription } from '@/hooks/useSubscription';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReviewsList from '@/components/editor/ReviewsList';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Calendar, Edit, ExternalLink, Play, Film, Plus } from 'lucide-react';

interface PortfolioItem {
    id: string;
    title: string;
    video_url: string;
    video_type: string;
    description?: string;
    order_position: number;
}

interface EditorProfile {
    bio: string;
    city: string;
    state: string;
    specialties: string[];
    software_skills: string[];
}

function MyProfile() {
    const { user } = useAuth();
    const { subscription } = useSubscription();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<EditorProfile | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    async function loadProfile() {
        try {
            // Fetch editor profile
            const { data: profileData } = await supabase
                .from('editor_profiles')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (profileData) {
                setProfile(profileData);
            }

            // Fetch user data for profile photo
            const { data: userData } = await supabase
                .from('users')
                .select('profile_photo_url')
                .eq('id', user?.id)
                .single();

            if (userData?.profile_photo_url && user) {
                // Update user object locally if needed, or just rely on the component re-render
                // Since we are using user from context, we might need to rely on the context update
                // But for now, let's ensure we are using the latest data in the UI
                user.profile_photo_url = userData.profile_photo_url;
            }

            // Fetch portfolio
            const { data: portfolioData } = await supabase
                .from('portfolio_videos')
                .select('*')
                .eq('editor_id', user?.id)
                .order('order_position', { ascending: true });

            if (portfolioData) {
                setPortfolio(portfolioData);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    }

    if (!user) return null;

    // Formatar data de entrada
    const joinDate = new Date(user.created_at).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    });

    const location = profile?.city && profile?.state
        ? `${profile.city}, ${profile.state}`
        : user.user_metadata?.location;

    return (
        <DashboardLayout
            userType="editor"
            title="Meu Perfil"
            subtitle="Veja como seu perfil aparece para os creators"
        >
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-start gap-6">
                            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                                <AvatarImage
                                    src={user?.profile_photo_url || user?.user_metadata?.avatar_url}
                                    alt={user?.full_name || 'Avatar'}
                                />
                                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                                    {user?.full_name?.charAt(0)?.toUpperCase() || 'E'}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2 w-full">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">
                                            {user.user_metadata?.full_name}
                                        </h2>
                                        <p className="text-muted-foreground">@{user.user_metadata?.username}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {subscription?.status === 'active' ? (
                                            <Badge variant="secondary" className="text-sm px-3 py-1">
                                                {subscription.subscription_plans.display_name}
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => navigate('/editor/subscription/plans')}
                                                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 hover:from-purple-700 hover:to-blue-700"
                                            >
                                                Seja Pro
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate('/editor/profile/edit')}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Editar Perfil
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
                                    {location && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {location}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Membro desde {joinDate}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Briefcase className="w-4 h-4" />
                                        Editor de Vídeo
                                    </div>
                                </div>

                                {profile?.bio && (
                                    <p className="text-foreground mt-4 leading-relaxed max-w-2xl">
                                        {profile.bio}
                                    </p>
                                )}

                                {/* Specialties & Skills */}
                                {(profile?.specialties?.length || profile?.software_skills?.length) ? (
                                    <div className="mt-6 space-y-4">
                                        {profile.specialties?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {profile.specialties.map((spec) => (
                                                    <Badge key={spec} variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                                        {spec}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {profile.software_skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {profile.software_skills.map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="bg-secondary/50">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Portfólio - 3 Vídeos Principais */}
                {portfolio.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Play className="w-5 h-5" />
                                Meu Portfólio
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/editor/profile/edit')}
                            >
                                Gerenciar Portfólio
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <PortfolioDisplay videos={portfolio} />
                        </CardContent>
                    </Card>
                )}

                {/* Empty state se não tem portfólio */}
                {portfolio.length === 0 && (
                    <Card className="p-6 text-center">
                        <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-foreground mb-2">
                            Seu portfólio está vazio
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Adicione vídeos ao seu portfólio para mostrar seu trabalho aos criadores.
                        </p>
                        <Button onClick={() => navigate('/editor/profile/edit')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Vídeos
                        </Button>
                    </Card>
                )}

                {/* Reviews Section */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-foreground px-1">
                        Avaliações e Feedback
                    </h3>
                    <ReviewsList editorId={user.id} showSummary={true} />
                </div>
            </div>
        </DashboardLayout>
    );
}

export default MyProfile;
