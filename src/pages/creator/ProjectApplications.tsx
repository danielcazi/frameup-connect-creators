import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import EditorProfileModal from '@/components/creator/EditorProfileModal';
import EmptyState from '@/components/ui/EmptyState';
import {
    Users,
    Star,
    Briefcase,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    Loader2,
    ArrowLeft,
    AlertCircle,
} from 'lucide-react';

interface Application {
    id: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    editor: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
        editor_profiles: {
            bio: string;
            city: string;
            state: string;
            specialties: string[];
            software_skills: string[];
            rating_average: number;
            total_projects: number;
            total_reviews: number;
        };
    };
}

interface Project {
    id: string;
    title: string;
    status: string;
    assigned_editor_id?: string;
}

function ProjectApplications() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEditor, setSelectedEditor] = useState<Application | null>(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    useEffect(() => {
        if (id && user) {
            loadProject();
            loadApplications();
        }
    }, [id, user]);

    async function loadProject() {
        if (!user || !id) return;
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, title, status, assigned_editor_id')
                .eq('id', id)
                .eq('creator_id', user.id)
                .single();

            if (error) throw error;

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Projeto não encontrado',
            });
            navigate('/creator/dashboard');
        }
    }

    async function loadApplications() {
        if (!id) return;
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('project_applications')
                .select(`
          id,
          message,
          status,
          created_at,
          editor:editor_id (
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
          )
        `)
                .eq('project_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // @ts-ignore
            setApplications(data || []);
        } catch (error) {
            console.error('Error loading applications:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar candidaturas',
            });
        } finally {
            setLoading(false);
        }
    }

    function handleViewProfile(application: Application) {
        setSelectedEditor(application);
        setShowProfileModal(true);
    }

    async function handleAcceptApplication(applicationId: string, editorId: string) {
        const confirmed = window.confirm(
            'Tem certeza que deseja selecionar este editor?\n\n' +
            'Ao aceitar:\n' +
            '• O editor será atribuído ao projeto\n' +
            '• As outras candidaturas serão rejeitadas automaticamente\n' +
            '• O projeto entrará em andamento\n' +
            '• Esta ação não pode ser desfeita'
        );

        if (!confirmed) return;

        try {
            // Chamar stored procedure (será criada no próximo prompt)
            const { data, error } = await supabase.rpc('accept_application', {
                p_application_id: applicationId,
                p_project_id: id,
                p_editor_id: editorId,
            });

            if (error) throw error;

            const result = data?.[0];

            if (result && !result.success) {
                throw new Error(result.error_message);
            }

            toast({
                title: 'Sucesso',
                description: 'Editor selecionado com sucesso! 🎉',
            });

            // Recarregar dados
            loadProject();
            loadApplications();
        } catch (error: any) {
            console.error('Error accepting application:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao selecionar editor',
            });
        }
    }

    async function handleRejectApplication(applicationId: string) {
        const confirmed = window.confirm(
            'Tem certeza que deseja rejeitar esta candidatura?\n\n' +
            'O editor será notificado da rejeição.'
        );

        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('project_applications')
                .update({ status: 'rejected' })
                .eq('id', applicationId);

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Candidatura rejeitada',
            });

            loadApplications();
        } catch (error) {
            console.error('Error rejecting application:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao rejeitar candidatura',
            });
        }
    }

    function getTimeAgo(date: string) {
        const now = new Date();
        const created = new Date(date);
        const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Agora há pouco';
        if (diffInHours < 24) return `${diffInHours}h atrás`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Ontem';
        if (diffInDays < 7) return `${diffInDays} dias atrás`;

        return created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'accepted':
                return <Badge className="bg-green-500 hover:bg-green-600 text-white">Aceito</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejeitado</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    const pendingApplications = applications.filter(app => app.status === 'pending');
    const acceptedApplication = applications.find(app => app.status === 'accepted');
    const rejectedApplications = applications.filter(app => app.status === 'rejected');

    if (loading) {
        return (
            <DashboardLayout
                userType="creator"
                title="Candidaturas"
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
            title={`Candidaturas: ${project?.title}`}
            subtitle="Analise os perfis e selecione o melhor editor"
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/creator/dashboard')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                </Button>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total de Candidaturas</span>
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-3xl font-bold text-foreground">{applications.length}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Pendentes</span>
                            <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="text-3xl font-bold text-foreground">{pendingApplications.length}</p>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-xl font-bold text-foreground">
                            {acceptedApplication ? 'Editor Selecionado' : 'Em Análise'}
                        </p>
                    </Card>
                </div>

                {/* Editor Aceito */}
                {acceptedApplication && (
                    <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-3 mb-4">
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-1">
                                    Editor Selecionado! 🎉
                                </h3>
                                <p className="text-green-700 dark:text-green-400">
                                    Você selecionou {acceptedApplication.editor.full_name} para trabalhar neste projeto.
                                    Agora você pode se comunicar via chat e acompanhar o progresso.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                            <div className="flex items-center gap-3">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={acceptedApplication.editor.profile_photo_url} alt={acceptedApplication.editor.full_name} />
                                    <AvatarFallback>{acceptedApplication.editor.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {acceptedApplication.editor.full_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        @{acceptedApplication.editor.username}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-sm font-medium">
                                                {acceptedApplication.editor.editor_profiles.rating_average.toFixed(1)}
                                            </span>
                                        </div>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-sm text-muted-foreground">
                                            {acceptedApplication.editor.editor_profiles.total_projects} projetos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={() => navigate(`/creator/project/${id}/chat`)}
                            >
                                Abrir Chat
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Candidaturas Pendentes */}
                {!acceptedApplication && pendingApplications.length > 0 && (
                    <div>
                        <h2 className="text-xl font-semibold text-foreground mb-4">
                            Candidaturas Pendentes ({pendingApplications.length})
                        </h2>

                        <div className="space-y-4">
                            {pendingApplications.map((application) => (
                                <Card key={application.id} className="p-6">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={application.editor.profile_photo_url} alt={application.editor.full_name} />
                                            <AvatarFallback>{application.editor.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground">
                                                        {application.editor.full_name}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        @{application.editor.username}
                                                    </p>
                                                </div>
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {getTimeAgo(application.created_at)}
                                                </span>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex flex-wrap items-center gap-4 mb-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">
                                                        {application.editor.editor_profiles.rating_average.toFixed(1)}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        ({application.editor.editor_profiles.total_reviews} avaliações)
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Briefcase className="w-4 h-4" />
                                                    <span className="text-sm">
                                                        {application.editor.editor_profiles.total_projects} projetos concluídos
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Location & Specialties */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                <Badge variant="secondary">
                                                    {application.editor.editor_profiles.city}, {application.editor.editor_profiles.state}
                                                </Badge>
                                                {application.editor.editor_profiles.specialties.slice(0, 3).map((specialty) => (
                                                    <Badge key={specialty} variant="default">
                                                        {specialty}
                                                    </Badge>
                                                ))}
                                            </div>

                                            {/* Message */}
                                            <div className="bg-muted/50 rounded-lg p-4 mb-4 border">
                                                <p className="text-sm text-foreground leading-relaxed">
                                                    {application.message}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap gap-3">
                                                <Button
                                                    variant="default"
                                                    onClick={() => handleViewProfile(application)}
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver Perfil Completo
                                                </Button>

                                                <Button
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleAcceptApplication(application.id, application.editor.id)}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Selecionar Editor
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                                    onClick={() => handleRejectApplication(application.id)}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Rejeitar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!acceptedApplication && pendingApplications.length === 0 && applications.length === 0 && (
                    <EmptyState
                        icon={Users}
                        title="Nenhuma candidatura ainda"
                        description="Quando editores se candidatarem ao seu projeto, eles aparecerão aqui. Seja paciente!"
                    />
                )}

                {/* Candidaturas Rejeitadas */}
                {rejectedApplications.length > 0 && (
                    <details className="group">
                        <summary className="cursor-pointer list-none">
                            <Card className="p-4 hover:border-muted-foreground/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Candidaturas Rejeitadas ({rejectedApplications.length})
                                    </h3>
                                    <span className="text-sm text-muted-foreground group-open:rotate-180 transition-transform">
                                        ▼
                                    </span>
                                </div>
                            </Card>
                        </summary>

                        <div className="mt-4 space-y-3">
                            {rejectedApplications.map((application) => (
                                <Card key={application.id} className="p-4 opacity-60">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={application.editor.profile_photo_url} alt={application.editor.full_name} />
                                            <AvatarFallback>{application.editor.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground">
                                                {application.editor.full_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                @{application.editor.username}
                                            </p>
                                        </div>
                                        {getStatusBadge(application.status)}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </details>
                )}
            </div>

            {/* Editor Profile Modal */}
            {showProfileModal && selectedEditor && (
                <EditorProfileModal
                    application={selectedEditor}
                    projectId={id!}
                    onClose={() => {
                        setShowProfileModal(false);
                        setSelectedEditor(null);
                    }}
                    onAccept={(applicationId, editorId) => {
                        setShowProfileModal(false);
                        handleAcceptApplication(applicationId, editorId);
                    }}
                    onReject={(applicationId) => {
                        setShowProfileModal(false);
                        handleRejectApplication(applicationId);
                    }}
                />
            )}
        </DashboardLayout>
    );
}

export default ProjectApplications;
