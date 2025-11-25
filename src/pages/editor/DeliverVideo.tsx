import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DeliveryHistory from '@/components/shared/DeliveryHistory';
import {
    Upload,
    CheckCircle,
    Clock,
    Loader2,
    ArrowLeft,
    AlertCircle
} from 'lucide-react';

interface Project {
    id: string;
    title: string;
    status: string;
    price: number;
}

interface Delivery {
    id: string;
    version: number;
    video_url: string;
    status: string;
    notes?: string;
    creator_feedback?: string;
    delivered_at: string;
    reviewed_at?: string;
}

function DeliverVideo() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [videoUrl, setVideoUrl] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (user && id) {
            loadProject();
            loadDeliveries();
        }
    }, [id, user]);

    async function loadProject() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, title, status, price')
                .eq('id', id)
                .eq('assigned_editor_id', user?.id)
                .single();

            if (error) throw error;

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Projeto não encontrado ou acesso negado.',
            });
            navigate('/editor/dashboard');
        } finally {
            setLoading(false);
        }
    }

    async function loadDeliveries() {
        try {
            const { data, error } = await supabase
                .from('delivered_videos')
                .select('*')
                .eq('project_id', id)
                .order('version', { ascending: false });

            if (error) throw error;

            setDeliveries(data || []);
        } catch (error) {
            console.error('Error loading deliveries:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!videoUrl.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'URL do vídeo é obrigatória',
            });
            return;
        }

        // Validar formato da URL
        if (!videoUrl.match(/^https?:\/\/.+/)) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'URL inválida. Deve começar com http:// ou https://',
            });
            return;
        }

        setSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('deliver_video', {
                p_project_id: id,
                p_editor_id: user?.id,
                p_video_url: videoUrl.trim(),
                p_notes: notes.trim() || null,
            });

            if (error) throw error;

            // RPC retorna array de resultados, pegamos o primeiro
            const result = data && data[0];

            if (!result || !result.success) {
                throw new Error(result?.error_message || 'Erro desconhecido ao entregar vídeo');
            }

            toast({
                title: 'Sucesso! 🎉',
                description: `Vídeo entregue! Versão ${result.version_number}`,
            });

            // Limpar form
            setVideoUrl('');
            setNotes('');

            // Recarregar dados
            loadProject();
            loadDeliveries();
        } catch (error: any) {
            console.error('Error delivering video:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao entregar vídeo',
            });
        } finally {
            setSubmitting(false);
        }
    }

    const latestDelivery = deliveries[0];
    const isPendingReview = latestDelivery?.status === 'pending_review';
    const revisionCount = deliveries.filter(d => d.status === 'revision_requested').length;
    const canDeliver = !isPendingReview && project?.status !== 'completed';

    if (loading) {
        return (
            <DashboardLayout
                userType="editor"
                title="Entregar Vídeo"
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
            title="Entregar Vídeo"
            subtitle={project?.title}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/editor/dashboard')}
                    className="pl-0 hover:pl-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                </Button>

                {/* Project Info */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-1">
                                    {project?.title}
                                </h2>
                                <p className="text-muted-foreground">
                                    Valor a receber: <span className="font-medium text-foreground">R$ {project?.price?.toFixed(2).replace('.', ',')}</span>
                                </p>
                            </div>
                            <Badge
                                variant={
                                    project?.status === 'in_progress'
                                        ? 'secondary'
                                        : project?.status === 'in_review'
                                            ? 'default'
                                            : 'outline'
                                }
                                className="text-sm px-3 py-1"
                            >
                                {project?.status === 'in_progress'
                                    ? 'Em Andamento'
                                    : project?.status === 'in_review'
                                        ? 'Em Revisão'
                                        : project?.status === 'completed'
                                            ? 'Concluído'
                                            : project?.status}
                            </Badge>
                        </div>

                        {/* Status Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <p className="text-sm text-muted-foreground mb-1">Total de Entregas</p>
                                <p className="text-2xl font-bold text-foreground">{deliveries.length}</p>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <p className="text-sm text-muted-foreground mb-1">Revisões Solicitadas</p>
                                <p className="text-2xl font-bold text-foreground">{revisionCount} / 3</p>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <p className="text-sm text-muted-foreground mb-1">Status Atual</p>
                                <p className="text-lg font-semibold text-foreground">
                                    {isPendingReview
                                        ? 'Aguardando Revisão'
                                        : project?.status === 'completed'
                                            ? 'Aprovado'
                                            : 'Pronto para Entregar'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Alerts */}
                {isPendingReview && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900 mb-1">
                                Vídeo em Revisão
                            </p>
                            <p className="text-sm text-blue-700">
                                O creator está analisando sua entrega. Você será notificado quando houver uma resposta.
                            </p>
                        </div>
                    </div>
                )}

                {project?.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-green-900 mb-1">
                                Vídeo Aprovado! 🎉
                            </p>
                            <p className="text-sm text-green-700 mb-2">
                                Parabéns! O creator aprovou seu trabalho. O pagamento será processado em breve.
                            </p>
                        </div>
                    </div>
                )}

                {/* Delivery Form */}
                {canDeliver && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="w-5 h-5 text-primary" />
                                Nova Entrega
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Video URL */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Link do Vídeo *
                                    </label>
                                    <Input
                                        type="url"
                                        value={videoUrl}
                                        onChange={(e) => setVideoUrl(e.target.value)}
                                        placeholder="https://youtube.com/watch?v=... ou https://drive.google.com/..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Aceito: YouTube, Vimeo, Google Drive ou qualquer link público
                                    </p>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">
                                        Notas da Entrega (opcional)
                                    </label>
                                    <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Descreva o que você fez nesta versão, mudanças implementadas, etc..."
                                        rows={4}
                                        maxLength={500}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground text-right">
                                        {notes.length} / 500 caracteres
                                    </p>
                                </div>

                                {/* Info Box */}
                                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                                    <p className="text-sm text-primary font-medium mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Antes de enviar:
                                    </p>
                                    <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                                        <li>Certifique-se que o vídeo está acessível publicamente</li>
                                        <li>Revise se todos os requisitos foram cumpridos</li>
                                        <li>Teste o link antes de enviar</li>
                                        <li>O creator terá até 3 chances de pedir revisões</li>
                                    </ul>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    disabled={submitting || !videoUrl.trim()}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 mr-2" />
                                            Entregar Vídeo
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Delivery History */}
                {deliveries.length > 0 && (
                    <DeliveryHistory deliveries={deliveries} userType="editor" />
                )}
            </div>
        </DashboardLayout>
    );
}

export default DeliverVideo;
