import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AvatarUpload from '@/components/profile/AvatarUpload';
import PortfolioManager from '@/components/profile/PortfolioManager';
import {
    Save,
    Eye,
    Loader2,
    User,
    MapPin,
    Briefcase,
    Code,
    FileVideo,
} from 'lucide-react';

const SPECIALTIES = [
    'Reels/Shorts',
    'YouTube',
    'Motion Graphics',
    'Animação',
    'Vlogs',
    'Gaming',
    'Corporativo',
    'Eventos',
    'Outro',
];

const SOFTWARES = [
    'Adobe Premiere Pro',
    'DaVinci Resolve',
    'Final Cut Pro',
    'After Effects',
    'Capcut',
    'Outro',
];

interface ProfileData {
    full_name: string;
    username: string;
    profile_photo_url?: string;
    editor_profiles: {
        bio: string;
        city: string;
        state: string;
        specialties: string[];
        software_skills: string[];
    };
}

function EditProfile() {
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [profilePhoto, setProfilePhoto] = useState('');
    const [bio, setBio] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [selectedSoftwares, setSelectedSoftwares] = useState<string[]>([]);

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

            // Buscar perfil do editor
            const { data: editorData, error: editorError } = await supabase
                .from('editor_profiles')
                .select('*')
                .eq('user_id', user?.id)
                .single();

            if (editorError && editorError.code !== 'PGRST116') throw editorError;

            // Preencher form
            setFullName(userData.full_name || '');
            setUsername(userData.username || '');
            setProfilePhoto(userData.profile_photo_url || '');

            if (editorData) {
                setBio(editorData.bio || '');
                setCity(editorData.city || '');
                setState(editorData.state || '');
                setSelectedSpecialties(editorData.specialties || []);
                setSelectedSoftwares(editorData.software_skills || []);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar perfil',
            });
        } finally {
            setLoading(false);
        }
    }

    function toggleSpecialty(specialty: string) {
        setSelectedSpecialties((prev) =>
            prev.includes(specialty)
                ? prev.filter((s) => s !== specialty)
                : [...prev, specialty]
        );
    }

    function toggleSoftware(software: string) {
        setSelectedSoftwares((prev) =>
            prev.includes(software)
                ? prev.filter((s) => s !== software)
                : [...prev, software]
        );
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

        if (bio.trim().length > 500) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Bio não pode ter mais de 500 caracteres',
            });
            return;
        }

        if (selectedSpecialties.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione pelo menos 1 especialidade',
            });
            return;
        }

        if (selectedSoftwares.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Selecione pelo menos 1 software',
            });
            return;
        }

        setSaving(true);

        try {
            // Atualizar users table
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

            // Upsert editor_profiles
            const { error: profileError } = await supabase
                .from('editor_profiles')
                .upsert({
                    user_id: user?.id,
                    bio: bio.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    specialties: selectedSpecialties,
                    software_skills: selectedSoftwares,
                });

            if (profileError) throw profileError;

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
                userType="editor"
                title="Editar Perfil"
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
            userType="editor"
            title="Editar Perfil"
            subtitle="Atualize suas informações profissionais"
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
                                    placeholder="Conte sobre você, sua experiência e estilo de trabalho..."
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

                    {/* Specialties */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Briefcase className="w-5 h-5" />
                                Especialidades *
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {SPECIALTIES.map((specialty) => (
                                    <button
                                        key={specialty}
                                        type="button"
                                        onClick={() => toggleSpecialty(specialty)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSpecialties.includes(specialty)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                                            }`}
                                    >
                                        {specialty}
                                    </button>
                                ))}
                            </div>

                            {selectedSpecialties.length === 0 && (
                                <p className="text-sm text-destructive mt-3">
                                    Selecione pelo menos 1 especialidade
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Software Skills */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Code className="w-5 h-5" />
                                Softwares *
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-3">
                                {SOFTWARES.map((software) => (
                                    <button
                                        key={software}
                                        type="button"
                                        onClick={() => toggleSoftware(software)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${selectedSoftwares.includes(software)
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                                            }`}
                                    >
                                        {software}
                                    </button>
                                ))}
                            </div>

                            {selectedSoftwares.length === 0 && (
                                <p className="text-sm text-destructive mt-3">
                                    Selecione pelo menos 1 software
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Portfolio */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <FileVideo className="w-5 h-5" />
                                Portfólio (máximo 3 vídeos)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PortfolioManager userId={user?.id || ''} />
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

                        <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="flex-1"
                            onClick={() => navigate(`/editor/profile`)}
                        >
                            <Eye className="w-5 h-5 mr-2" />
                            Visualizar Perfil
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default EditProfile;
