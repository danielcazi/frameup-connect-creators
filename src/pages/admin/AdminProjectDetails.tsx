import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    Calendar,
    FileText,
    ExternalLink,
    Film,
    Sparkles,
    Clock,
    DollarSign,
    Users,
    MessageSquare,
    History,
    Play,
    CheckCircle,
    AlertCircle,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Chat from '@/pages/shared/Chat';
import { getProjectDeliveries } from '@/services/deliveryService';
import type { ProjectDelivery } from '@/types/delivery';

export default function AdminProjectDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAdmin();

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);

    useEffect(() => {
        if (id) {
            loadProjectData();
        }
    }, [id]);

    const loadProjectData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Project Details
            const { data: projectData, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    creator:creator_id (
                        id, full_name, email, phone
                    ),
                    editor:assigned_editor_id (
                        id, full_name, email, phone
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setProject(projectData);

            // 2. Fetch Deliveries
            const deliveriesData = await getProjectDeliveries(id!);
            setDeliveries(deliveriesData);

        } catch (error) {
            console.error('Erro ao carregar projeto:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-blue-100 text-blue-800';
            case 'open': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'in_review': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/projects')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>ID: {project.id}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                {project.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="briefing" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="briefing" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Briefing & Detalhes
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Chat
                    </TabsTrigger>
                    <TabsTrigger value="revisions" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Revisões e Entregas
                    </TabsTrigger>
                </TabsList>

                {/* BRIEFING TAB */}
                <TabsContent value="briefing">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Project Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Informações do Projeto</h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Tipo de Vídeo</p>
                                        <div className="flex items-center gap-2">
                                            <Film className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium capitalize">{project.video_type}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Estilo de Edição</p>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            <span className="font-medium capitalize">{project.editing_style}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Duração Estimada</p>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            <span className="font-medium">{project.duration_category}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-gray-500">Valor Base</p>
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                            <span className="font-medium">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.base_price)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Descrição</h4>
                                        <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
                                    </div>
                                    {project.context_description && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Contexto</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap">{project.context_description}</p>
                                        </div>
                                    )}
                                    {project.reference_links && (
                                        <div>
                                            <h4 className="font-medium text-gray-900 mb-2">Links de Referência</h4>
                                            <a href={project.reference_links} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                {project.reference_links} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Right Column: People Involved */}
                        <div className="space-y-6">
                            <Card className="p-6">
                                <h3 className="text-lg font-semibold mb-4">Participantes</h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {project.creator?.full_name?.charAt(0) || 'C'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Criador (Cliente)</p>
                                            <p className="text-sm text-gray-600">{project.creator?.full_name}</p>
                                            <p className="text-xs text-gray-500">{project.creator?.email}</p>
                                            <p className="text-xs text-gray-500">{project.creator?.phone || 'Sem telefone'}</p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4 flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                            {project.editor?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Editor Atribuído</p>
                                            {project.editor ? (
                                                <>
                                                    <p className="text-sm text-gray-600">{project.editor.full_name}</p>
                                                    <p className="text-xs text-gray-500">{project.editor.email}</p>
                                                </>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">Nenhum editor atribuído</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* CHAT TAB */}
                <TabsContent value="chat">
                    <Card className="h-[600px] overflow-hidden border-0 shadow-none">
                        {/* We reuse the Chat component but pass a prop to indicate admin view if needed, 
                            or navigate to a specific admin chat wrapper if strict isolation is required.
                            However, the plan is to modify Chat.tsx to allow admins.
                        */}
                        <Chat isAdminView={true} />
                    </Card>
                </TabsContent>

                {/* REVISIONS TAB */}
                <TabsContent value="revisions">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Histórico de Entregas</h3>
                            <Badge variant="secondary">{deliveries.length} versões</Badge>
                        </div>

                        {deliveries.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Nenhuma entrega registrada ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {deliveries.map((delivery) => (
                                    <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Play className="w-5 h-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-gray-900">Versão  {delivery.version}</span>
                                                    {delivery.status === 'approved' && (
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>
                                                    )}
                                                    {delivery.status === 'revision_requested' && (
                                                        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Revisão Solicitada</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Enviado em {new Date(delivery.submitted_at).toLocaleDateString('pt-BR')} às {new Date(delivery.submitted_at).toLocaleTimeString('pt-BR')}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/project/${project.id}/revision/${delivery.version}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" />
                                            Visualizar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
