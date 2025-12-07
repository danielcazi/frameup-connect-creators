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
import { ProjectDetailsLoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { getProjectDeliveries } from '@/services/deliveryService';
import type { ProjectDelivery } from '@/types/delivery';
import { canEditProject, getProjectStatusLabel } from '@/lib/projects';
import {
    Calendar,
    DollarSign,
    Clock,
    Film,
    Sparkles,
    Users,
    FileText,
    ExternalLink,
    ArrowLeft,
    Edit,
    History,
    Play,
    CheckCircle,
    AlertCircle,
    Eye,
    CheckCircle2,
    Lock,
} from 'lucide-react';

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
    reference_links?: string;
    context_description?: string;
    created_at: string;
    status: string;
    assigned_editor_id?: string;
    _count?: {
        applications: number;
    };
}

function CreatorProjectDetails() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [applicationCount, setApplicationCount] = useState(0);
    const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);
    const [latestDelivery, setLatestDelivery] = useState<ProjectDelivery | null>(null);

    useEffect(() => {
        if (id && user) {
            loadProject();
            loadApplicationCount();
        }
    }, [id, user]);

    async function loadProject() {
        try {
            setLoading(true);

            // Carregar entregas
            const projectDeliveries = await getProjectDeliveries(id!);
            setDeliveries(projectDeliveries);

            if (projectDeliveries.length > 0) {
                setLatestDelivery(projectDeliveries[0]);
            }

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .eq('creator_id', user?.id)
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
        } finally {
            setLoading(false);
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

    function getStatusBadge(project: Project) {
        const statusLabel = getProjectStatusLabel(project);
        const status = project.status;
        const hasEditor = !!project.assigned_editor_id;

        if (status === 'draft') return <Badge variant="secondary">{statusLabel}</Badge>;
        if (status === 'open' || (status === 'published' && !hasEditor)) return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">{statusLabel}</Badge>;
        if (status === 'in_progress' || (status === 'published' && hasEditor)) return <Badge variant="default">{statusLabel}</Badge>;
        if (status === 'in_review') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">{statusLabel}</Badge>;
        if (status === 'completed') return <Badge className="bg-green-500 hover:bg-green-600 text-white">{statusLabel}</Badge>;
        if (status === 'cancelled') return <Badge variant="destructive">{statusLabel}</Badge>;

        return <Badge variant="secondary">{statusLabel}</Badge>;
    }

    if (loading) {
        return (
            <DashboardLayout
                userType="creator"
                title="Detalhes do Projeto"
                subtitle="Carregando..."
            >
                <ProjectDetailsLoadingSkeleton />
            </DashboardLayout>
        );
    }

    if (!project) {
        return null;
    }

    return (
        <DashboardLayout
            userType="creator"
            title="Detalhes do Projeto"
            subtitle="Visualize as informações do seu projeto"
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/creator/projects')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar aos Projetos
                    </Button>

                    <div className="flex gap-2">
                        {project.status === 'open' && applicationCount > 0 && (
                            <Button
                                onClick={() => navigate(`/creator/project/${project.id}/applications`)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Ver Candidaturas ({applicationCount})
                            </Button>
                        )}
                        {/* Edit Button Logic */}
                        {canEditProject(project) ? (
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/creator/project/${project.id}/edit`)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                            </Button>
                        ) : project?.assigned_editor_id ? (
                            <Button variant="outline" disabled title="Não é possível editar após aceitar um editor">
                                <Lock className="w-4 h-4 mr-2" />
                                Bloqueado
                            </Button>
                        ) : null}
                    </div>
                </div>

                {/* Main Card */}
                <Card className="p-8">
                    {/* Title & Status */}
                    <div className="mb-6 flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                                {project.title}
                            </h1>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                        {getStatusBadge(project)}
                    </div>

                    {/* Quick Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-muted/30 rounded-lg border">
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
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-muted-foreground" />
                                Descrição Detalhada
                            </h3>
                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                {project.description}
                            </p>
                        </div>

                        {project.context_description && (
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                    Contexto do Projeto
                                </h3>
                                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {project.context_description}
                                </p>
                            </div>
                        )}

                        {/* Reference Files */}
                        {project.reference_files_url && (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <ExternalLink className="w-5 h-5 text-primary" />
                                    Arquivos de Referência
                                </h3>
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

                        {/* Reference Links */}
                        {project.reference_links && (
                            <div className="p-4 bg-muted rounded-lg border">
                                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <ExternalLink className="w-5 h-5 text-muted-foreground" />
                                    Links de Referência
                                </h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">
                                    {project.reference_links}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Price Info */}
                    <div className="mt-8 pt-6 border-t flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Valor do Projeto</p>
                            <p className="text-3xl font-bold text-green-600 flex items-center gap-2">
                                <DollarSign className="w-7 h-7" />
                                R$ {Number(project.base_price).toFixed(2).replace('.', ',')}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Candidaturas</p>
                            <p className="text-2xl font-bold text-foreground flex items-center gap-2 justify-end">
                                <Users className="w-6 h-6" />
                                {applicationCount}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Seção de Revisão - Só aparece quando há entrega pendente */}
                {latestDelivery && latestDelivery.status === 'pending_review' && (
                    <Card className="p-6 mt-6 border-primary/50 bg-primary/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Play className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Vídeo Aguardando Revisão</h3>
                                    <p className="text-muted-foreground">
                                        O editor enviou a versão {latestDelivery.version} para sua aprovação
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => navigate(`/creator/project/${id}/review`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Revisar Vídeo
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Seção de Status quando já foi revisado */}
                {latestDelivery && latestDelivery.status === 'approved' && (
                    <Card className="p-6 mt-6 border-green-500/50 bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
                                    Projeto Concluído
                                </h3>
                                <p className="text-green-600 dark:text-green-500">
                                    Você aprovou a versão {latestDelivery.version} em{' '}
                                    {new Date(latestDelivery.updated_at).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Seção quando correções foram solicitadas */}
                {latestDelivery && latestDelivery.status === 'revision_requested' && (
                    <Card className="p-6 mt-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-400">
                                    Aguardando Correções
                                </h3>
                                <p className="text-amber-600 dark:text-amber-500">
                                    Você solicitou correções na versão {latestDelivery.version}.
                                    Aguarde o editor enviar uma nova versão.
                                </p>
                            </div>
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
                                            onClick={() => navigate(`/project/${project?.id}/revision/${delivery.version}`)}
                                        >
                                            {index === 0 ? 'Ver Revisão' : 'Ver Histórico'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}

export default CreatorProjectDetails;
