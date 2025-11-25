import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReviewsList from '@/components/editor/ReviewsList';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Briefcase, Calendar, ExternalLink, Play, MessageSquare, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

interface UserData {
    id: string;
    full_name: string;
    username: string;
    profile_photo_url?: string;
    created_at: string;
}

function PublicProfile() {
    const { username } = useParams();
    const { user: currentUser, userType } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [editorProfile, setEditorProfile] = useState<EditorProfile | null>(null);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);

    useEffect(() => {
        if (username) {
            loadProfile(username.replace('@', ''));
        }
    }, [username]);

    async function loadProfile(targetUsername: string) {
        try {
            setLoading(true);

            // 1. Find user by username
            const { data: userResult, error: userError } = await supabase
                .from('users')
                .select('id, full_name, username, profile_photo_url, created_at')
                .eq('username', targetUsername)
                .single();

            if (userError || !userResult) {
                throw new Error('Editor não encontrado');
            }

            setUserData(userResult);

            // 2. Fetch editor profile
            const { data: profileResult } = await supabase
                .from('editor_profiles')
                .select('*')
                .eq('user_id', userResult.id)
                .single();

            if (profileResult) {
                setEditorProfile(profileResult);
            }

            // 3. Fetch portfolio
            const { data: portfolioResult } = await supabase
                .from('portfolio_videos')
                .select('*')
                .eq('editor_id', userResult.id)
                .order('order_position', { ascending: true });

            if (portfolioResult) {
                setPortfolio(portfolioResult);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Editor não encontrado ou erro ao carregar perfil.',
            });
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <DashboardLayout
                userType={userType || 'creator'}
                title="Perfil do Editor"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!userData) return null;

    const joinDate = new Date(userData.created_at).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    });

    const location = editorProfile?.city && editorProfile?.state
        ? `${editorProfile.city}, ${editorProfile.state}`
        : null;

    const isOwnProfile = currentUser?.id === userData.id;

    return (
        <DashboardLayout
            userType={userType || 'creator'}
            title="Perfil do Editor"
            subtitle={`Conheça o trabalho de ${userData.full_name}`}
        >
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <Card>
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-start gap-6">
                            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                                <AvatarImage src={userData.profile_photo_url} alt={userData.full_name} />
                                <AvatarFallback className="text-2xl">
                                    {userData.full_name.charAt(0)}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 space-y-2 w-full">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">
                                            {userData.full_name}
                                        </h2>
                                        <p className="text-muted-foreground">@{userData.username}</p>
                                    </div>

                                    {!isOwnProfile && (
                                        <div className="flex items-center gap-3">
                                            <Button variant="outline" onClick={() => {
                                                // TODO: Implement chat/message logic
                                                toast({ description: "Funcionalidade de chat em breve!" });
                                            }}>
                                                <MessageSquare className="w-4 h-4 mr-2" />
                                                Mensagem
                                            </Button>
                                            {userType === 'creator' && (
                                                <Button onClick={() => {
                                                    // TODO: Implement invite logic
                                                    toast({ description: "Funcionalidade de convite em breve!" });
                                                }}>
                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                    Convidar
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {isOwnProfile && (
                                        <Button variant="outline" onClick={() => navigate('/editor/profile/edit')}>
                                            Editar Perfil
                                        </Button>
                                    )}
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

                                {editorProfile?.bio && (
                                    <p className="text-foreground mt-4 leading-relaxed max-w-2xl">
                                        {editorProfile.bio}
                                    </p>
                                )}

                                {/* Specialties & Skills */}
                                {(editorProfile?.specialties?.length || editorProfile?.software_skills?.length) ? (
                                    <div className="mt-6 space-y-4">
                                        {editorProfile.specialties?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {editorProfile.specialties.map((spec) => (
                                                    <Badge key={spec} variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                                        {spec}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {editorProfile.software_skills?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {editorProfile.software_skills.map((skill) => (
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
                    <ReviewsList editorId={userData.id} showSummary={true} />
                </div>
            </div>
        </DashboardLayout>
    );
}

export default PublicProfile;
