import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Clock,
    DollarSign,
    FileText,
    ExternalLink,
    MessageSquare,
    Upload,
    CheckCircle,
    AlertCircle,
    Eye,
    Film,
    Palette,
    Timer,
    User,
    Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DeliveryModal from '@/components/editor/DeliveryModal';
import ApplicationModal from '@/components/editor/ApplicationModal';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import {
    canDeliver as canDeliverStatus,
    getStatusBadgeConfig,
    PROJECT_STATUS,
    APPLICATION_STATUS,
} from '@/constants/statusConstants';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title: string;
    status: string;
    specific_instructions?: string;
    delivery_id?: string;
    delivery_url?: string;
    revision_count: number;
    approved_at?: string;
    created_at: string;
}

interface Delivery {
    id: string;
    project_id: string;
    batch_video_id?: string;
    editor_id: string;
    video_url: string;
    title?: string;
    description?: string;
    version: number;
    status: string;
    created_at: string;
    reviewed_at?: string;
    creator_feedback?: string;
}

interface Project {
    id: string;
    title: string;
    description: string;
    status: string;
    base_price: number;
    deadline_days: number;
    video_type: string;
    editing_style: string;
    duration_seconds: number;
    reference_links?: string;
    raw_footage_url?: string;
    brand_assets_url?: string;
    creator_id: string;
    assigned_editor_id?: string;
    created_at: string;
    deadline_at?: string;
    is_batch?: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: string;
    batch_videos?: BatchVideo[];
    users?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

const EditorProjectDetails = () => {
    // ⚠️ CORREÇÃO: A rota é /editor/project/:id, então precisamos usar { id }
    const { id: projectId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    // Capturar parâmetro ?video= da URL
    const videoId = searchParams.get('video');

    const [project, setProject] = useState<Project | null>(null);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');

    // Dados do vídeo específico (se for lote)
    const currentBatchVideo = useMemo(() => {
        if (!videoId || !project?.batch_videos) return null;
        return project.batch_videos.find(v => v.id === videoId) || null;
    }, [videoId, project?.batch_videos]);

    const isViewingSpecificVideo = !!currentBatchVideo;

    // Filtrar entregas para o vídeo específico
    const filteredDeliveries = useMemo(() => {
        console.log('[ProjectDetails] Debugging Deliveries:', {
            videoId,
            isViewingSpecificVideo,
            totalDeliveries: deliveries.length,
            deliveries: deliveries.map(d => ({ id: d.id, batch_vid: d.batch_video_id, version: d.version }))
        });

        if (!isViewingSpecificVideo) return deliveries;
        return deliveries.filter(d => d.batch_video_id === videoId);
    }, [deliveries, isViewingSpecificVideo, videoId]);

    // Status e informações do vídeo/projeto
    const currentStatus = isViewingSpecificVideo
        ? currentBatchVideo?.status
        : project?.status;

    const currentRevisionCount = isViewingSpecificVideo
        ? currentBatchVideo?.revision_count || 1
        : (filteredDeliveries.length || 1);

    // Verificar se pode entregar (usando função centralizada)
    const canDeliverVideo = canDeliverStatus(currentStatus);

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
            checkApplicationStatus();
        }
    }, [projectId]);

    const checkApplicationStatus = async () => {
        if (!user || !projectId) return;
        try {
            const { data } = await supabase
                .from('project_applications')
                .select('status')
                .eq('project_id', projectId)
                .eq('editor_id', user.id)
                .maybeSingle();

            if (data) {
                setApplicationStatus(data.status);
            }
        } catch (error) {
            console.error('Error checking application status:', error);
        }
    };

    // Fetch project com batch_videos
    const fetchProjectDetails = async () => {
        setLoading(true);
        try {
            // Buscar projeto com creator
            const { data: projectData, error: projectError } = await supabase
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
                .eq('id', projectId)
                .single();

            if (projectError) throw projectError;

            // Se for lote, buscar batch_videos
            if (projectData.is_batch) {
                const { data: batchVideos } = await supabase
                    .from('batch_videos')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('sequence_order', { ascending: true });

                projectData.batch_videos = batchVideos || [];
            }

            setProject(projectData);

            // Buscar entregas
            const { data: deliveriesData } = await supabase
                .from('project_deliveries')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            setDeliveries(deliveriesData || []);

        } catch (error) {
            console.error('Error fetching project:', error);
            toast({
                title: "Erro ao carregar projeto",
                description: "Não foi possível carregar os detalhes do projeto.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Handler de entrega
    const handleDeliverySuccess = () => {
        setIsDeliveryModalOpen(false);
        fetchProjectDetails();
        toast({
            title: "Vídeo entregue!",
            description: "Sua entrega foi enviada para revisão do creator.",
        });
    };

    const handleApplicationSuccess = () => {
        setIsApplicationModalOpen(false);
        checkApplicationStatus();
        toast({
            title: "Candidatura enviada!",
            description: "O criador será notificado sobre sua candidatura.",
        });
    };

    // Helpers - usando funções centralizadas
    const getStatusBadge = (status: string) => {
        const config = getStatusBadgeConfig(status);
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    // Loading state
    if (loading) {
        return (
            <DashboardLayout userType="editor" title="Detalhes do Projeto">
                <div className="space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project) {
        return (
            <DashboardLayout userType="editor" title="Projeto não encontrado">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Projeto não encontrado.</p>
                    <Button onClick={() => navigate('/editor/my-projects')} className="mt-4">
                        Voltar aos Projetos
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const creator = project.users;

    return (
        <DashboardLayout userType="editor" title="Detalhes do Projeto" subtitle="Analise os requisitos antes de se candidatar">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header com navegação */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Button>
                </div>

                {/* Card principal do projeto */}
                <Card>
                    <CardContent className="p-6">
                        {/* Header com título e badge de vídeo */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {project.title}
                                </h1>

                                {/* Info do Creator */}
                                {creator && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={creator.profile_photo_url} />
                                            <AvatarFallback>
                                                {creator.full_name?.charAt(0) || <User className="w-3 h-3" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {creator.full_name || creator.username}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Seletor de Vídeo para Projetos em Lote */}
                            {project.is_batch ? (
                                <div className="text-right">
                                    <Select
                                        value={videoId || 'all'}
                                        onValueChange={(value) => {
                                            const newParams = new URLSearchParams(searchParams);
                                            if (value === 'all') {
                                                newParams.delete('video');
                                            } else {
                                                newParams.set('video', value);
                                            }
                                            navigate(`?${newParams.toString()}`, { replace: true });
                                        }}
                                    >
                                        <SelectTrigger className="w-[200px] h-9">
                                            <SelectValue placeholder="Selecione um vídeo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Visão Geral (Todos)</SelectItem>
                                            {project.batch_videos?.map((video) => (
                                                <SelectItem key={video.id} value={video.id}>
                                                    Vídeo {video.sequence_order} - {video.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {isViewingSpecificVideo && currentBatchVideo && (
                                        <p className="text-xs text-gray-500 mt-1 flex justify-end items-center gap-1">
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {currentBatchVideo.status === 'completed' ? 'Concluído' : 'Em andamento'}
                                            </Badge>
                                        </p>
                                    )}
                                </div>
                            ) : (
                                /* Badge original para quando não é lote (se houver futuro uso) ou manter layout */
                                null
                            )}
                        </div>

                        {/* Informações do projeto */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
                            <div className="flex items-center gap-2">
                                <Film className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Tipo</p>
                                    <p className="text-sm font-medium">{project.video_type || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Palette className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Estilo</p>
                                    <p className="text-sm font-medium">{project.editing_style || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Duração</p>
                                    <p className="text-sm font-medium">{project.duration_seconds || 0}s</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500">Prazo</p>
                                    <p className="text-sm font-medium">{project.deadline_days} dias</p>
                                </div>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="mb-6">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                <FileText className="w-4 h-4" />
                                Descrição do Projeto
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {project.description}
                            </p>
                        </div>

                        {/* Instruções específicas do vídeo (se for lote) */}
                        {isViewingSpecificVideo && currentBatchVideo?.specific_instructions && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                    <Layers className="w-4 h-4" />
                                    Instruções Específicas do Vídeo {currentBatchVideo.sequence_order}
                                </h3>
                                <p className="text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
                                    {currentBatchVideo.specific_instructions}
                                </p>
                            </div>
                        )}

                        {/* Arquivos de Referência */}
                        {(project.raw_footage_url || project.brand_assets_url) && (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                    <ExternalLink className="w-4 h-4" />
                                    Arquivos de Referência
                                </h3>
                                <p className="text-xs text-gray-500 mb-3">
                                    O criador forneceu materiais de referência para este projeto
                                </p>
                                <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
                                    <a href={project.raw_footage_url || project.brand_assets_url} target="_blank" rel="noopener noreferrer">
                                        Acessar Arquivos <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                </Button>
                            </div>
                        )}

                        {/* Valor */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">
                                {isViewingSpecificVideo ? 'Valor deste Vídeo' : 'Valor do Projeto'}
                            </p>
                            <p className="text-3xl font-bold text-green-600">
                                {formatCurrency(project.base_price)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Você receberá após aprovação do vídeo
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card de ações (você está trabalhando) */}
                {project.assigned_editor_id === user?.id && (
                    <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                        Você está trabalhando neste projeto
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Status: {getStatusBadge(currentStatus || 'in_progress')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => navigate(`/editor/project/${projectId}/chat`)}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Chat com Creator
                                </Button>

                                {canDeliverVideo && (
                                    <Button
                                        className="flex-1"
                                        onClick={() => setIsDeliveryModalOpen(true)}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Entregar Vídeo
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Card de candidatura (Projeto Aberto e não é o editor) */}
                {project.status === PROJECT_STATUS.OPEN && !project.assigned_editor_id && (
                    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                        Interesse neste projeto?
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Envie uma proposta e mostre seu portfólio para o criador.
                                    </p>
                                </div>
                            </div>

                            {applicationStatus === APPLICATION_STATUS.NONE ? (
                                <Button
                                    className="w-full"
                                    onClick={() => setIsApplicationModalOpen(true)}
                                >
                                    Candidatar-se ao Projeto
                                </Button>
                            ) : (
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border text-center">
                                    <p className="text-sm font-medium mb-1">Status da Candidatura</p>
                                    {getStatusBadge(applicationStatus)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Histórico de revisões (filtrado por vídeo se aplicável) */}
                {filteredDeliveries.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Clock className="w-5 h-5" />
                                {isViewingSpecificVideo && currentBatchVideo
                                    ? `Histórico de Revisões (Vídeo ${currentBatchVideo.sequence_order})`
                                    : "Histórico de Revisões (Geral)"
                                }
                                <Badge variant="secondary" className="ml-2">
                                    {filteredDeliveries.length} versão(ões)
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredDeliveries.map((delivery, index) => (
                                    <div
                                        key={delivery.id}
                                        className="flex items-center justify-between p-4 rounded-lg border"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${index === 0 ? 'bg-blue-500' : 'bg-gray-400'
                                                    }`}
                                            >
                                                v{delivery.version}
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {delivery.description || `Versão ${delivery.version}`}
                                                    {index === 0 && (
                                                        <Badge variant="secondary" className="ml-2 text-xs">
                                                            Atual
                                                        </Badge>
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formatDateTime(delivery.created_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(delivery.status)}
                                            <Button variant="outline" size="sm" asChild>
                                                <Link
                                                    to={`/project/${projectId}/revision/${delivery.version}${delivery.batch_video_id ? `?video=${delivery.batch_video_id}` : ''}`}
                                                >
                                                    Ver Revisão
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Modal de entrega (passa batch_video_id se for vídeo específico) */}
            <DeliveryModal
                isOpen={isDeliveryModalOpen}
                onClose={() => setIsDeliveryModalOpen(false)}
                projectId={projectId!}
                videoType={project?.video_type || 'vertical'}
                batchVideoId={isViewingSpecificVideo ? videoId : undefined}
                currentVersion={currentRevisionCount}
                onSuccess={handleDeliverySuccess}
                project={project}
            />

            {/* Modal de Candidatura */}
            {project && project.users && isApplicationModalOpen && (
                <ApplicationModal
                    project={project as any}
                    onClose={() => setIsApplicationModalOpen(false)}
                    onSuccess={handleApplicationSuccess}
                />
            )}
        </DashboardLayout>
    );
};

export default EditorProjectDetails;
