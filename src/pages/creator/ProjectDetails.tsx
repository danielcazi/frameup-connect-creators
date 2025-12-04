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

    useEffect(() => {
        if (id && user) {
            loadProject();
            loadApplicationCount();
        }
    }, [id, user]);

    async function loadProject() {
        try {
            setLoading(true);

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

    function getStatusBadge(status: string) {
        switch (status) {
            case 'draft':
                return <Badge variant="secondary">Rascunho</Badge>;
            case 'open':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Aberto</Badge>;
            case 'in_progress':
                return <Badge variant="default">Em Andamento</Badge>;
            case 'in_review':
                return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Em Revisão</Badge>;
            case 'completed':
                return <Badge className="bg-green-500 hover:bg-green-600 text-white">Concluído</Badge>;
            case 'cancelled':
                return <Badge variant="destructive">Cancelado</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
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
                        {/* Only allow edit if draft or open with no applications (simplified rule) */}
                        {(project.status === 'draft' || (project.status === 'open' && applicationCount === 0)) && (
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/creator/project/${project.id}/edit`)}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                            </Button>
                        )}
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
                        {getStatusBadge(project.status)}
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
            </div>
        </DashboardLayout>
    );
}

export default CreatorProjectDetails;
