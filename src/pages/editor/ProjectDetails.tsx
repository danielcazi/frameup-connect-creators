import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SubscriptionGuard from '@/components/guards/SubscriptionGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ProjectDetailsLoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import ApplicationModal from '@/components/editor/ApplicationModal';
import {
    Calendar,
    DollarSign,
    Clock,
    Film,
    Sparkles,
    Users,

    FileText,
    ExternalLink,
    Loader2,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    Upload,
    History,
    Video,
    CheckCircle2,
    AlertTriangle,
    Send
} from 'lucide-react';
import { getProjectDeliveries } from '@/services/deliveryService';
import type { ProjectDelivery } from '@/types/delivery';

interface Project {
    id: string;
    title: string;
    description: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    deadline_days: number;
    reference_files_url?: string;
    created_at: string;
    status: string;
    payment_status: string;
    assigned_editor_id?: string;
    users: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

function ProjectDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const { subscription } = useSubscription();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationCount, setApplicationCount] = useState(0);
    const [currentProjectsCount, setCurrentProjectsCount] = useState(0);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [isAssigned, setIsAssigned] = useState(false);
    const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);
    const [latestDelivery, setLatestDelivery] = useState<ProjectDelivery | null>(null);

    useEffect(() => {
        if (id) {
            loadProject();
            checkApplication();
            loadApplicationCount();
            loadCurrentProjectsCount();
        }
    }, [id]);

    async function loadProject() {
        try {
            setLoading(true);

            // Buscar o projeto sem filtro de status para verificar se o editor está atribuído
            const { data, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    users:creator_id (
                        id,
                        full_name,
                        username,
                        profile_photo_url
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            // Verificar se o editor tem acesso ao projeto
            const isAssignedEditor = data.assigned_editor_id === user?.id;
            const isOpenForApplications = data.status === 'open' && data.payment_status === 'paid';

            // Se não é o editor atribuído E não está aberto para candidaturas, negar acesso
            if (!isAssignedEditor && !isOpenForApplications) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Este projeto não está mais disponível para visualização.',
                });
                navigate('/editor/dashboard');
                return;
            }

            // @ts-ignore
            setProject(data);
            setIsAssigned(isAssignedEditor);

            if (isAssignedEditor) {
                const projectDeliveries = await getProjectDeliveries(id!);
                setDeliveries(projectDeliveries);
                if (projectDeliveries.length > 0) {
                    setLatestDelivery(projectDeliveries[0]);
                }
            }
        } catch (error) {
            console.error('Error loading project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Projeto não encontrado.',
            });
            navigate('/editor/dashboard');
        } finally {
            setLoading(false);
        }
    }

    async function checkApplication() {
        if (!user || !id) return;
        try {
            const { data } = await supabase
                .from('project_applications')
                .select('id')
                .eq('project_id', id)
                .eq('editor_id', user.id)
                .in('status', ['pending', 'accepted'])
                .single();

            setHasApplied(!!data);
        } catch (error) {
            // Não se candidatou ainda
        }
    }

    async function loadApplicationCount() {
        if (!id) return;
        try {
            const { count } = await supabase
                .from('project_applications')
                .select('id', { count: 'exact', head: true })
                .eq('project_id', id);

            setApplicationCount(count || 0);
        } catch (error) {
            console.error('Error loading application count:', error);
        }
    }

    async function loadCurrentProjectsCount() {
        if (!user) return;
        try {
            const { count } = await supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_editor_id', user.id)
                .eq('status', 'in_progress');

            setCurrentProjectsCount(count || 0);
        } catch (error) {
            console.error('Error loading projects count:', error);
        }
    }

    const videoTypeLabels: Record<string, string> = {
        reels: 'Reels/Shorts',
        youtube: 'YouTube',
        motion: 'Motion Design',
    };

    const editingStyleLabels: Record<string, string> = {
        lofi: 'Lofi',
        dynamic: 'Dinâmica',
        pro: 'Profissional',
        motion: 'Motion Graphics',
    };

    const durationLabels: Record<string, string> = {
        '30s': '30 segundos',
        '1m': '1 minuto',
        '2m': '2 minutos',
        '5m': '5+ minutos',
    };

    if (loading) {
        return (
            <SubscriptionGuard requireActive={true}>
                <DashboardLayout
                    userType="editor"
                    title="Detalhes do Projeto"
                    subtitle="Carregando..."
                >
                    <ProjectDetailsLoadingSkeleton />
                </DashboardLayout>
            </SubscriptionGuard>
        );
    }

    if (!project) {
        return null;
    }

    const isFull = applicationCount >= 5;
    const canApply =
        !hasApplied &&
        !isFull &&
        currentProjectsCount < (subscription?.subscription_plans.max_simultaneous_projects || 0);

    // Se o editor está atribuído ao projeto, mostrar botões de trabalho
    const showWorkActions = isAssigned && ['in_progress', 'in_review', 'revision_requested'].includes(project?.status || '');

    return (
        <SubscriptionGuard requireActive={true}>
            <DashboardLayout
                userType="editor"
                title="Detalhes do Projeto"
                subtitle="Analise os requisitos antes de se candidatar"
            >
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/editor/dashboard')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao Marketplace
                    </Button>

                    {/* Status Alerts */}
                    {hasApplied && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-green-900 dark:text-green-300 mb-1">
                                    Você já se candidatou a este projeto
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                    Aguarde o criador analisar sua candidatura. Você será notificado sobre a decisão.
                                </p>
                            </div>
                        </div>
                    )}

                    {isFull && !hasApplied && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-700 dark:text-yellow-400">
                                Este projeto atingiu o limite de 5 candidaturas e não está mais aceitando novas aplicações.
                            </p>
                        </div>
                    )}

                    {!canApply && !hasApplied && !isFull && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-900 dark:text-red-300 mb-1">
                                    Limite de Projetos Atingido
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-400">
                                    Você atingiu o limite de {subscription?.subscription_plans.max_simultaneous_projects} projetos simultâneos.
                                    Complete um projeto antes de se candidatar a novos.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Main Card */}
                    <Card className="p-8">
                        {/* Title & Creator */}
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-foreground mb-4">
                                {project.title}
                            </h1>

                            <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={project.users.profile_photo_url} alt={project.users.full_name} />
                                    <AvatarFallback>{project.users?.full_name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {project.users.full_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">@{project.users.username}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg border">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                                <div className="flex items-center gap-1.5">
                                    <Film className="w-4 h-4 text-primary" />
                                    <p className="font-medium text-foreground text-sm">
                                        {videoTypeLabels[project.video_type] || project.video_type}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Estilo</p>
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    <p className="font-medium text-foreground text-sm">
                                        {editingStyleLabels[project.editing_style] || project.editing_style}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Duração</p>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <p className="font-medium text-foreground text-sm">
                                        {durationLabels[project.duration_category] || project.duration_category}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Prazo</p>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <p className="font-medium text-foreground text-sm">
                                        {project.deadline_days} dias
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                Descrição do Projeto
                            </h3>
                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                {project.description}
                            </p>
                        </div>

                        {/* Reference Files */}
                        {project.reference_files_url && (
                            <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <ExternalLink className="w-5 h-5 text-primary" />
                                    Arquivos de Referência
                                </h3>
                                <p className="text-sm text-muted-foreground mb-3">
                                    O criador forneceu materiais de referência para este projeto
                                </p>
                                <a
                                    href={project.reference_files_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-2"
                                >
                                    Acessar Arquivos
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}

                        {/* Price & Applications */}
                        {/* Price - Candidaturas ocultas para editor (visível apenas para Creator) */}
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <p className="text-sm text-muted-foreground mb-1">Valor do Projeto</p>
                            <p className="text-3xl font-bold text-green-600 flex items-center gap-2">
                                <DollarSign className="w-7 h-7" />
                                R$ {Number(project.base_price).toFixed(2).replace('.', ',')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Você receberá após aprovação do vídeo
                            </p>
                        </div>
                    </Card>

                    {/* Ações do Editor Atribuído */}
                    {showWorkActions && (
                        <Card className="p-6 border-primary/20 bg-primary/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Você está trabalhando neste projeto</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Status: {project?.status === 'in_progress' ? 'Em Andamento' :
                                            project?.status === 'in_review' ? 'Em Revisão' :
                                                project?.status === 'revision_requested' ? 'Revisão Solicitada' : project?.status}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button
                                    type="button"
                                    onClick={() => navigate(`/editor/project/${project?.id}/chat`)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Chat com Creator
                                </Button>

                                {project?.status === 'in_progress' && (
                                    <Button
                                        type="button"
                                        onClick={() => navigate(`/editor/project/${project?.id}/deliver`)}
                                        className="flex-1"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Entregar Vídeo
                                    </Button>
                                )}

                                {project?.status === 'revision_requested' && (
                                    <Button
                                        type="button"
                                        onClick={() => navigate(`/editor/project/${project?.id}/deliver`)}
                                        variant="destructive"
                                        className="flex-1"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Enviar Revisão
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Histórico de Revisões */}
                    {deliveries.length > 0 && (
                        <Card className="p-6 mt-6">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                Histórico de Revisões
                                <Badge variant="secondary" className="ml-2">
                                    {deliveries.length} versão(ões)
                                </Badge>
                            </h3>

                            <div className="space-y-3">
                                {deliveries.map((delivery, index) => (
                                    <div
                                        key={delivery.id}
                                        className={`
                                        flex items-center justify-between p-4 rounded-lg border transition-all
                                        ${index === 0
                                                ? 'bg-primary/5 border-primary/30'
                                                : 'bg-muted/50 border-muted'
                                            }
                                    `}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Badge de versão */}
                                            <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                            ${index === 0
                                                    ? 'bg-primary text-white'
                                                    : 'bg-muted-foreground/20 text-muted-foreground'
                                                }
                                        `}>
                                                v{delivery.version}
                                            </div>

                                            <div>
                                                <p className="font-medium flex items-center gap-2">
                                                    {delivery.title || `Entrega ${delivery.version}`}
                                                    {index === 0 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Atual
                                                        </Badge>
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {new Date(delivery.submitted_at || delivery.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Status Badge Atualizado */}
                                            <Badge
                                                variant="outline"
                                                className={
                                                    delivery.status === 'approved'
                                                        ? 'bg-green-100 text-green-700 border-green-300'
                                                        : delivery.status === 'revision_requested'
                                                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                                                            : 'bg-amber-100 text-amber-700 border-amber-300'
                                                }
                                            >
                                                {delivery.status === 'approved' && (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Aprovado
                                                    </span>
                                                )}
                                                {delivery.status === 'revision_requested' && (
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Revisado ✓
                                                    </span>
                                                )}
                                                {delivery.status === 'pending_review' && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Aguardando Revisão
                                                    </span>
                                                )}
                                            </Badge>

                                            <Button
                                                type="button"
                                                variant={index === 0 ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => navigate(`/project/${id}/revision/${delivery.version}`)}
                                            >
                                                {index === 0 ? 'Ver Revisão' : 'Ver Histórico'}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Seção para enviar nova versão - Aparece quando Creator pediu correções */}
                    {latestDelivery && latestDelivery.status === 'revision_requested' && (
                        <Card className="p-6 mt-6 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/20 rounded-full">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">Enviar Nova Versão</h3>
                                    <p className="text-muted-foreground mt-1">
                                        O Creator solicitou correções na versão {latestDelivery.version}.
                                        Envie a versão {latestDelivery.version + 1} com as alterações.
                                    </p>

                                    {/* Feedback do Creator */}
                                    {latestDelivery.creator_feedback && (
                                        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4" />
                                                Feedback do Creator:
                                            </p>
                                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                {latestDelivery.creator_feedback}
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        className="mt-4"
                                        onClick={() => navigate(`/editor/project/${id}/deliver`)}
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar Versão {latestDelivery.version + 1}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Seção quando está aguardando revisão do Creator */}
                    {latestDelivery && latestDelivery.status === 'pending_review' && (
                        <Card className="p-6 mt-6 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full animate-pulse">
                                    <Video className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-400">
                                        Aguardando Revisão do Creator
                                    </h3>
                                    <p className="text-amber-600 dark:text-amber-500">
                                        Sua versão {latestDelivery.version} está sendo analisada.
                                        Você será notificado quando houver feedback.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Seção quando projeto foi aprovado */}
                    {latestDelivery && latestDelivery.status === 'approved' && (
                        <Card className="p-6 mt-6 border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                                        Projeto Aprovado! 🎉
                                    </h3>
                                    <p className="text-green-600 dark:text-green-500">
                                        O Creator aprovou a versão {latestDelivery.version}.
                                        O pagamento será processado em breve.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Action Card - Candidatura (só mostra se NÃO está atribuído) */}
                    {!isAssigned && (
                        <Card className="p-8">
                            <h3 className="text-lg font-semibold text-foreground mb-4">
                                Candidatar-se ao Projeto
                            </h3>

                            {hasApplied ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                    <p className="text-muted-foreground mb-6">
                                        Você já se candidatou a este projeto. Aguarde a resposta do criador.
                                    </p>
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        onClick={() => navigate('/editor/dashboard')}
                                    >
                                        Voltar ao Marketplace
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-muted-foreground mb-6">
                                        Ao se candidatar, você demonstra interesse em trabalhar neste projeto.
                                        O criador analisará seu perfil e portfólio antes de tomar uma decisão.
                                    </p>

                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={() => setShowApplicationModal(true)}
                                        disabled={!canApply || isFull}
                                    >
                                        {isFull
                                            ? 'Vagas Preenchidas'
                                            : !canApply
                                                ? 'Limite de Projetos Atingido'
                                                : 'Candidatar-se Agora'}
                                    </Button>
                                </>
                            )}
                        </Card>
                    )}
                </div>

                {/* Application Modal */}
                {showApplicationModal && (
                    <ApplicationModal
                        project={project}
                        onClose={() => setShowApplicationModal(false)}
                        onSuccess={() => {
                            setHasApplied(true);
                            setShowApplicationModal(false);
                            setApplicationCount(prev => prev + 1);
                        }}
                    />
                )}
            </DashboardLayout>
        </SubscriptionGuard>
    );
}

export default ProjectDetails;
