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
import { MapPin, Briefcase, Calendar, Edit, ExternalLink, Play } from 'lucide-react';

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
                            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                                <AvatarImage src={user.user_metadata?.profile_photo_url} alt={user.user_metadata?.full_name} />
                                <AvatarFallback className="text-2xl">
                                    {user.user_metadata?.full_name?.charAt(0)}
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
                                        <Badge variant="secondary" className="text-sm px-3 py-1">
                                            Editor Pro
                                        </Badge>
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

                {/* Portfolio Section */}
                {portfolio.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-foreground px-1">
                            Portfólio
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {portfolio.map((item) => (
                                <Card key={item.id} className="overflow-hidden group">
                                    <div className="aspect-video bg-muted relative">
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                            <Play className="w-12 h-12 text-muted-foreground opacity-50" />
                                        </div>
                                        <a
                                            href={item.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300">
                                                <Play className="w-5 h-5 text-primary ml-1" />
                                            </div>
                                        </a>
                                    </div>
                                    <CardContent className="p-4">
                                        <h4 className="font-medium truncate" title={item.title}>
                                            {item.title}
                                        </h4>
                                        <a
                                            href={item.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 truncate"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {item.video_url}
                                        </a>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
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
