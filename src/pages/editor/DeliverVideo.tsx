import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Link, Youtube, HardDrive, ArrowLeft, AlertCircle, CheckCircle, Video } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createDelivery, detectVideoType, getProjectDeliveries } from '@/services/deliveryService';
import type { ProjectDelivery } from '@/types/delivery';

// Interface do Vídeo de Lote
interface BatchVideo {
    id: string;
    sequence_order: number;
    title?: string;
    status: string;
}

interface Project {
    id: string;
    title: string;
    creator_id: string;
    assigned_editor_id: string;
    status: string;
    current_revision: number;
    max_free_revisions: number;
    users: {
        full_name: string;
    };
    is_batch: boolean;
    batch_videos?: BatchVideo[];
}

export default function DeliverVideo() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [deliveries, setDeliveries] = useState<ProjectDelivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [videoUrl, setVideoUrl] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [selectedBatchVideoId, setSelectedBatchVideoId] = useState<string>('');
    const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; type: string | null; error?: string } | null>(null);

    useEffect(() => {
        if (id && user) {
            loadProjectData();
        }
    }, [id, user]);

    useEffect(() => {
        if (videoUrl.trim()) {
            const validation = detectVideoType(videoUrl);
            setUrlValidation(validation);
        } else {
            setUrlValidation(null);
        }
    }, [videoUrl]);

    // Auto-select batch video if only one candidate
    useEffect(() => {
        if (project?.is_batch && project.batch_videos && !selectedBatchVideoId) {
            const candidates = project.batch_videos.filter(v => v.status !== 'approved');
            // Prefer 'in_progress' or 'revision'
            const priority = candidates.find(v => ['in_progress', 'revision'].includes(v.status));

            if (priority) {
                setSelectedBatchVideoId(priority.id);
            } else if (candidates.length > 0) {
                setSelectedBatchVideoId(candidates[0].id);
            }
        }
    }, [project]);

    const loadProjectData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Project
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select(`
                    id, title, creator_id, assigned_editor_id, status,
                    current_revision, max_free_revisions, is_batch,
                    users:creator_id (full_name)
                `)
                .eq('id', id)
                .single();

            if (projectError) throw projectError;

            if (projectData.assigned_editor_id !== user?.id) {
                toast({ variant: 'destructive', title: 'Acesso negado', description: 'Você não tem permissão para entregar vídeos neste projeto.' });
                navigate('/editor/dashboard');
                return;
            }

            // 2. Fetch Batch Videos if applicable
            let batchVideos: BatchVideo[] = [];
            if (projectData.is_batch) {
                const { data: videosData, error: videosError } = await supabase
                    .from('batch_videos')
                    .select('id, sequence_order, title, status')
                    .eq('project_id', id)
                    .order('sequence_order', { ascending: true });

                if (!videosError && videosData) {
                    batchVideos = videosData;
                }
            }

            setProject({ ...projectData as any, batch_videos: batchVideos });

            // 3. Fetch Deliveries
            const previousDeliveries = await getProjectDeliveries(id!);
            setDeliveries(previousDeliveries);

        } catch (error) {
            console.error('Error loading project:', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o projeto.' });
            navigate('/editor/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!urlValidation?.isValid || !urlValidation.type) {
            toast({ variant: 'destructive', title: 'URL inválida', description: urlValidation?.error || 'URL inválida.' });
            return;
        }

        if (project?.is_batch && !selectedBatchVideoId) {
            toast({ variant: 'destructive', title: 'Selecione o vídeo', description: 'Você precisa selecionar qual vídeo do lote está entregando.' });
            return;
        }

        setSubmitting(true);
        try {
            const { delivery, error } = await createDelivery({
                project_id: id!,
                video_url: videoUrl,
                video_type: urlValidation.type as 'youtube' | 'gdrive',
                title: title || undefined,
                description: description || undefined,
                batch_video_id: selectedBatchVideoId || undefined // Pass the selected batch video ID
            });

            if (error) throw new Error(error);

            toast({ title: 'Vídeo enviado com sucesso!', description: 'O creator foi notificado e irá revisar seu trabalho.' });
            navigate(`/editor/project/${id}`);
        } catch (error: any) {
            console.error('Error submitting delivery:', error);
            toast({ variant: 'destructive', title: 'Erro ao enviar', description: error.message || 'Tente novamente.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userType="editor" title="Entregar Vídeo" subtitle="Carregando...">
                <div className="max-w-3xl mx-auto space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project) return null;

    const nextVersion = (project.current_revision || 0) + 1;
    const isRevision = project.status === 'revision_requested' || (project.is_batch && selectedBatchVideoId ?
        project.batch_videos?.find(v => v.id === selectedBatchVideoId)?.status === 'revision' : false);

    return (
        <DashboardLayout
            userType="editor"
            title={`Enviar Entrega`}
            subtitle={`Projeto: ${project.title}`}
        >
            <div className="max-w-3xl mx-auto">
                <Button type="button" variant="ghost" onClick={() => navigate(`/editor/project/${id}`)} className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Projeto
                </Button>

                <Card className="p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{project.title}</h2>
                            <p className="text-muted-foreground">Creator: {project.users?.full_name}</p>
                        </div>
                        {/* Se for lote, mostra qual vídeo está sendo entregue ou prompt para selecionar */}
                        {project.is_batch ? (
                            <Badge variant="outline" className="ml-2">Projeto em Lote</Badge>
                        ) : (
                            <Badge
                                variant={nextVersion > 1 ? 'default' : 'secondary'}
                                className={nextVersion > 1 ? 'bg-primary text-white' : ''}
                            >
                                {nextVersion > 1 ? `Versão ${nextVersion} (Correção)` : 'Primeira Entrega'}
                            </Badge>
                        )}
                    </div>

                    {nextVersion > 1 && !project.is_batch && (
                        <Alert className="mt-4">
                            <Video className="h-4 w-4" />
                            <AlertTitle>Enviando Correção</AlertTitle>
                            <AlertDescription>
                                Esta será a versão {nextVersion} do vídeo.
                                {nextVersion <= project.max_free_revisions
                                    ? ` Você ainda tem ${project.max_free_revisions - nextVersion + 1} revisão(ões) gratuita(s).`
                                    : ' Esta é uma revisão paga.'}
                            </AlertDescription>
                        </Alert>
                    )}
                </Card>

                {deliveries.length > 0 && (
                    <Card className="p-6 mb-6">
                        <h3 className="font-semibold mb-4">Entregas Anteriores</h3>
                        <div className="space-y-2">
                            {deliveries.map((delivery) => (
                                <div key={delivery.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">v{delivery.version}</Badge>
                                        <span className="text-sm">
                                            {delivery.status === 'approved' && '✅ Aprovado'}
                                            {delivery.status === 'revision_requested' && '🔄 Revisão'}
                                            {delivery.status === 'pending_review' && '⏳ Aguardando'}
                                        </span>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => navigate(`/project/${id}/revision/${delivery.version}`)}>
                                        Ver
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                <Card className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            {isRevision ? 'Enviar Vídeo Corrigido' : 'Nova Entrega'}
                        </h3>

                        {/* Batch Video Selector */}
                        {project.is_batch && project.batch_videos && (
                            <div className="space-y-2">
                                <Label htmlFor="batchVideo">Qual vídeo você está entregando? *</Label>
                                <Select
                                    value={selectedBatchVideoId}
                                    onValueChange={setSelectedBatchVideoId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um vídeo da lista..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {project.batch_videos.map(video => (
                                            <SelectItem key={video.id} value={video.id}>
                                                #{video.sequence_order} - {video.title || `Vídeo ${video.sequence_order}`} ({video.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="videoUrl">URL do Vídeo *</Label>
                            <div className="relative">
                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="videoUrl"
                                    placeholder="https://www.youtube.com/watch?v=... ou https://drive.google.com/file/d/..."
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="pl-10"
                                    required
                                />
                            </div>

                            {urlValidation && (
                                <div className={`flex items-center gap-2 text-sm ${urlValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                                    {urlValidation.isValid ? (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            {urlValidation.type === 'youtube' && <><Youtube className="h-4 w-4" /> YouTube detectado</>}
                                            {urlValidation.type === 'gdrive' && <><HardDrive className="h-4 w-4" /> Google Drive detectado</>}
                                        </>
                                    ) : (
                                        <><AlertCircle className="h-4 w-4" />{urlValidation.error}</>
                                    )}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">⚠️ Vídeos do Google Drive devem estar com compartilhamento público.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Título da Entrega (Opcional)</Label>
                            <Input id="title" placeholder={project.is_batch ? 'Ex: Versão Final' : `Versão ${nextVersion}`} value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (Opcional)</Label>
                            <Textarea id="description" placeholder="Descreva as alterações..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(`/editor/project/${id}`)} disabled={submitting}>Cancelar</Button>
                            <Button type="submit" disabled={!urlValidation?.isValid || submitting || (project.is_batch && !selectedBatchVideoId)}>
                                <Upload className="h-4 w-4 mr-2" />
                                {submitting
                                    ? 'Enviando...'
                                    : 'Enviar Entrega'
                                }
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </DashboardLayout>
    );
}
