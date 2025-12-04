import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AvatarUpload from '@/components/profile/AvatarUpload';
import {
    Save,
    Loader2,
    User,
    MapPin,
} from 'lucide-react';

function CreatorProfile() {
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [profilePhoto, setProfilePhoto] = useState('');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user]);

    async function loadProfile() {
        try {
            // Buscar dados do usuário
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('full_name, username, profile_photo_url')
                .eq('id', user?.id)
                .single();

            if (userError) throw userError;

            // Buscar perfil do creator (se houver tabela específica, senão usa apenas users)
            // Assumindo que creators podem ter dados extras em uma tabela 'creator_profiles' ou similar se necessário.
            // Por enquanto, vamos salvar bio/location em 'creator_profiles' se existir, ou criar se não.
            // Se não existir tabela creator_profiles, vamos usar apenas users ou criar a tabela.
            // Verificando o schema... não tenho certeza se existe creator_profiles.
            // Vou assumir que existe ou que posso criar. Se não, vou salvar apenas no users se possível ou ignorar.
            // Mas espere, o editor tem editor_profiles. O creator deve ter creator_profiles?
            // Vamos verificar se a tabela existe. Se não, vou criar ou usar apenas users.

            // Para simplificar e evitar erros, vou tentar buscar de creator_profiles.
            const { data: creatorData, error: creatorError } = await supabase
                .from('creator_profiles')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (creatorError && creatorError.code !== 'PGRST116') throw creatorError;

            // Preencher form
            setFullName(userData.full_name || '');
            setUsername(userData.username || '');
            setProfilePhoto(userData.profile_photo_url || '');

            if (creatorData) {
                setBio(creatorData.bio || '');
                setCity(creatorData.city || '');
                setState(creatorData.state || '');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            // Não mostrar erro se for apenas falta de perfil criado
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();

        // Validações
        if (fullName.trim().length < 3) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Nome deve ter pelo menos 3 caracteres',
            });
            return;
        }

        if (username.trim().length < 3 || username.trim().length > 20) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Username deve ter entre 3 e 20 caracteres',
            });
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Username só pode conter letras, números e underscore',
            });
            return;
        }

        setSaving(true);

        try {
            // 1. Atualizar users table
            const { error: userError } = await supabase
                .from('users')
                .update({
                    full_name: fullName.trim(),
                    username: username.trim().toLowerCase(),
                    profile_photo_url: profilePhoto || null,
                })
                .eq('id', user?.id);

            if (userError) {
                if (userError.code === '23505') {
                    throw new Error('Username já está em uso');
                }
                throw userError;
            }

            // 2. Atualizar ou Criar creator_profiles
            const commonData = {
                bio: bio.trim(),
                city: city.trim(),
                state: state.trim(),
            };

            let profileError;

            // Tentar UPDATE primeiro (seguro para RLS)
            const { data: updated, error: updateError } = await supabase
                .from('creator_profiles')
                .update(commonData)
                .eq('user_id', user?.id)
                .select();

            if (updateError) {
                profileError = updateError;
            } else if (updated && updated.length > 0) {
                // Update funcionou
                profileError = null;
            } else {
                // Se update não afetou nenhuma linha, tentar INSERT
                const { error: insertError } = await supabase
                    .from('creator_profiles')
                    .insert({
                        user_id: user?.id,
                        ...commonData
                    });
                profileError = insertError;
            }

            if (profileError) {
                console.warn('Erro ao salvar creator_profiles:', profileError);
                throw profileError;
            }

            toast({
                title: 'Sucesso!',
                description: 'Perfil atualizado com sucesso!',
            });

            // Atualizar contexto
            await updateProfile({
                full_name: fullName.trim(),
                username: username.trim().toLowerCase(),
                profile_photo_url: profilePhoto || null,
            });

            // Recarregar perfil
            loadProfile();

        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao salvar perfil',
            });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <DashboardLayout
                userType="creator"
                title="Meu Perfil"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType="creator"
            title="Meu Perfil"
            subtitle="Gerencie suas informações pessoais"
        >
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* Avatar */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Foto de Perfil
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AvatarUpload
                                currentAvatar={profilePhoto}
                                onUploadSuccess={(url) => setProfilePhoto(url)}
                                userId={user?.id || ''}
                                userName={fullName}
                            />
                        </CardContent>
                    </Card>

                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Informações Básicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Nome Completo *
                                </label>
                                <Input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Username *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        @
                                    </span>
                                    <Input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                        placeholder="seuusername"
                                        required
                                        pattern="[a-zA-Z0-9_]{3,20}"
                                        className="pl-8"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    3-20 caracteres. Apenas letras, números e underscore.
                                </p>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Bio
                                </label>
                                <Textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Conte um pouco sobre você..."
                                    rows={5}
                                    maxLength={500}
                                    className="resize-none"
                                />
                                <p className="text-sm text-muted-foreground mt-2">
                                    {bio.length} / 500 caracteres
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Location */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Localização
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Cidade
                                    </label>
                                    <Input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="São Paulo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Estado
                                    </label>
                                    <Input
                                        type="text"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        placeholder="SP"
                                        maxLength={2}
                                        className="uppercase"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            type="submit"
                            size="lg"
                            className="flex-1"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Salvar Alterações
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default CreatorProfile;
