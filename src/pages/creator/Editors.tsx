import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import EmptyState from '@/components/common/EmptyState';
import Avatar from '@/components/common/Avatar';

interface Editor {
    id: string;
    full_name: string;
    username: string;
    profile_photo_url?: string;
    bio?: string;
    portfolio_url?: string;
    specialties?: string[];
    rating?: number;
}

const CreatorEditors = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [editors, setEditors] = useState<Editor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user) {
            fetchEditors();
        }
    }, [user, searchTerm]);

    const fetchEditors = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('users')
                .select(`
                    *,
                    editor_profiles (
                        bio,
                        specialties,
                        rating_average
                    )
                `)
                .eq('user_type', 'editor');

            if (searchTerm) {
                query = query.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            const mappedEditors = data?.map((user: any) => {
                const profile = Array.isArray(user.editor_profiles) ? user.editor_profiles[0] : user.editor_profiles;
                return {
                    ...user,
                    bio: profile?.bio,
                    specialties: profile?.specialties,
                    rating: profile?.rating_average
                };
            }) || [];

            setEditors(mappedEditors);
        } catch (error) {
            console.error('Error fetching editors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = (username: string) => {
        navigate(`/editor/profile/${username}`);
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout
            userType="creator"
            title="Editores"
            subtitle="Encontre os melhores editores para seus projetos"
        >
            {/* Search Section */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar por nome ou usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Editors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && (
                    <>
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </>
                )}

                {!loading && editors.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            illustration="users"
                            title="Nenhum editor encontrado"
                            description={searchTerm ? "Tente buscar com outros termos." : "Não há editores cadastrados no momento."}
                        />
                    </div>
                )}

                {!loading && editors.map((editor) => (
                    <div key={editor.id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                        <Avatar
                            src={editor.profile_photo_url}
                            alt={editor.full_name}
                            size="lg"
                            className="mb-4"
                        />
                        <h3 className="font-semibold text-lg text-gray-900">{editor.full_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">@{editor.username}</p>

                        {editor.bio && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                {editor.bio}
                            </p>
                        )}

                        <div className="mt-auto w-full">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => handleViewProfile(editor.username)}
                            >
                                <User className="w-4 h-4 mr-2" />
                                Ver Perfil
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default CreatorEditors;
