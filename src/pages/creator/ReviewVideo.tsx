import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import DeliveryHistory from '@/components/shared/DeliveryHistory';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    ExternalLink,
    Play,
    Star,
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
}

function ReviewVideo() {
    const { id } = useParams();
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const [showRevisionForm, setShowRevisionForm] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [hasReviewed, setHasReviewed] = useState(false);

    useEffect(() => {
        if (user && id) {
            loadProject();
            loadDeliveries();
        }
    }, [id, user]);

    useEffect(() => {
        if (project?.status === 'completed' && user) {
            checkReview();
        }
    }, [project, user]);

    async function checkReview() {
        try {
            const { data } = await supabase
                .from('reviews')
                .select('id')
                .eq('project_id', id)
                .eq('reviewer_id', user?.id)
                .single();

            setHasReviewed(!!data);
        } catch (error) {
            // Ignore error (e.g. no rows found)
            setHasReviewed(false);
        }
    }

    async function loadProject() {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('id, title, status, price')
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
                description: 'Projeto não encontrado ou acesso negado.',
            });
            navigate('/creator/dashboard');
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

    async function handleApprove() {
        const latestDelivery = deliveries[0];

        const confirmed = window.confirm(
            'Tem certeza que deseja aprovar este vídeo?\n\n' +
            'Ao aprovar:\n' +
            '• O pagamento será liberado para o editor\n' +
            '• O projeto será marcado como concluído\n' +
            '• Esta ação não pode ser desfeita\n\n' +
            'Confirmar aprovação?'
        );

        if (!confirmed) return;

        setActionLoading(true);

        try {
            // Nota: A função approve_video ainda não foi criada no banco, mas será no próximo passo.
            // Por enquanto, vou deixar o código pronto para chamá-la.
            // Se der erro, é porque a função não existe ainda.
            const { data, error } = await supabase.rpc('approve_video', {
                p_delivery_id: latestDelivery.id,
                p_project_id: id,
                p_creator_id: user?.id,
            });

            if (error) throw error;

            const result = data && data[0];

            if (!result || !result.success) {
                throw new Error(result?.error_message || 'Erro ao aprovar vídeo');
            }

            // Chamar edge function para processar pagamento
            try {
                await supabase.functions.invoke('release-payment', {
                    body: { project_id: id }
                });
            } catch (paymentError) {
                console.error('Erro ao processar pagamento:', paymentError);
                // Não falhar o fluxo principal, pois o vídeo já foi aprovado
                // O pagamento ficará pendente e poderá ser processado depois
            }

            toast({
                title: 'Sucesso! 🎉',
                description: 'Vídeo aprovado! Pagamento será processado.',
            });

            // Recarregar dados
            loadProject();
            loadDeliveries();
        } catch (error: any) {
            console.error('Error approving video:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao aprovar vídeo. A função pode não existir ainda.',
            });
        } finally {
            setActionLoading(false);
        }
    }

    async function handleRequestRevision(e: React.FormEvent) {
        e.preventDefault();

        const latestDelivery = deliveries[0];

        if (feedback.trim().length < 10) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Feedback deve ter pelo menos 10 caracteres',
            });
            return;
        }

        setActionLoading(true);

        try {
            const { data, error } = await supabase.rpc('request_revision', {
                p_delivery_id: latestDelivery.id,
                p_project_id: id,
                p_creator_id: user?.id,
                p_feedback: feedback.trim(),
            });

            if (error) throw error;

            const result = data && data[0];

            if (!result || !result.success) {
                throw new Error(result?.error_message || 'Erro ao solicitar revisão');
            }

            toast({
                title: 'Sucesso!',
                description: `Revisão solicitada! (${result.revision_count}/3)`,
            });

            // Limpar form e fechar
            setFeedback('');
            setShowRevisionForm(false);

            // Recarregar dados
            loadProject();
            loadDeliveries();
        } catch (error: any) {
            console.error('Error requesting revision:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao solicitar revisão',
            });
        } finally {
            setActionLoading(false);
        }
    }

    const latestDelivery = deliveries[0];
    const isPendingReview = latestDelivery?.status === 'pending_review';
    const revisionCount = deliveries.filter(d => d.status === 'revision_requested').length;
    const canRequestRevision = revisionCount < 3;

    if (loading) {
        return (
            <DashboardLayout
                userType="creator"
                title="Revisar Vídeo"
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
            title="Revisar Vídeo"
            subtitle={project?.title}
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/creator/dashboard')}
                    className="pl-0 hover:pl-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Dashboard
                </Button>

                {/* Latest Delivery Card */}
                {isPendingReview && latestDelivery && (
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-2xl font-bold text-foreground">
                                            Versão {latestDelivery.version}
                                        </h2>
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Aguardando Revisão</Badge>
                                    </div>
                                    <p className="text-muted-foreground">
                                        Entregue em{' '}
                                        {new Date(latestDelivery.delivered_at).toLocaleString('pt-BR')}
                                    </p>
                                </div>

                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground mb-1">Revisões usadas</p>
                                    <p className="text-2xl font-bold text-foreground">
                                        {revisionCount} / 3
                                    </p>
                                </div>
                            </div>

                            {/* Video Player */}
                            <div className="bg-black rounded-lg aspect-video mb-6 flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <a
                                        href={latestDelivery.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-3 text-white hover:text-primary transition-colors transform group-hover:scale-105 duration-200"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                            <Play className="w-8 h-8 fill-current" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-medium">Assistir Vídeo</span>
                                            <ExternalLink className="w-4 h-4" />
                                        </div>
                                    </a>
                                </div>
                            </div>

                            {/* Editor Notes */}
                            {latestDelivery.notes && (
                                <div className="bg-blue-50/50 rounded-lg p-4 mb-6 border border-blue-100">
                                    <p className="text-sm text-blue-900 font-medium mb-2">
                                        Notas do Editor:
                                    </p>
                                    <p className="text-blue-800 whitespace-pre-line text-sm">
                                        {latestDelivery.notes}
                                    </p>
                                </div>
                            )}

                            {/* Revision Limit Warning */}
                            {!canRequestRevision && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-yellow-900 mb-1">
                                            Limite de Revisões Atingido
                                        </p>
                                        <p className="text-sm text-yellow-700">
                                            Você já solicitou 3 revisões. Agora você deve aprovar o vídeo ou cancelar o projeto.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            {!showRevisionForm ? (
                                <div className="flex gap-3">
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        size="lg"
                                        onClick={handleApprove}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                        )}
                                        Aprovar Vídeo
                                    </Button>

                                    {canRequestRevision && (
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-yellow-200 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                                            size="lg"
                                            onClick={() => setShowRevisionForm(true)}
                                            disabled={actionLoading}
                                        >
                                            <XCircle className="w-5 h-5 mr-2" />
                                            Solicitar Revisão
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleRequestRevision} className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Feedback para o Editor *
                                        </label>
                                        <Textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Descreva os ajustes necessários de forma clara e detalhada..."
                                            rows={6}
                                            maxLength={500}
                                            required
                                            className="resize-none"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2 text-right">
                                            {feedback.length} / 500 caracteres (mínimo 10)
                                        </p>
                                    </div>

                                    <div className="bg-yellow-50/50 rounded-lg p-4 border border-yellow-100">
                                        <p className="text-sm text-yellow-900 font-medium mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Seja específico:
                                        </p>
                                        <ul className="text-sm text-yellow-800 space-y-1 list-disc ml-5">
                                            <li>Indique timestamps se necessário</li>
                                            <li>Seja claro sobre o que precisa mudar</li>
                                            <li>Evite feedback genérico ou vago</li>
                                            <li>Mantenha tom profissional e respeitoso</li>
                                        </ul>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="lg"
                                            className="flex-1"
                                            onClick={() => {
                                                setShowRevisionForm(false);
                                                setFeedback('');
                                            }}
                                            disabled={actionLoading}
                                        >
                                            Cancelar
                                        </Button>

                                        <Button
                                            type="submit"
                                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                                            size="lg"
                                            disabled={actionLoading || feedback.trim().length < 10}
                                        >
                                            {actionLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    Solicitar Revisão ({revisionCount + 1}/3)
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* No Pending Delivery */}
                {!isPendingReview && project?.status !== 'completed' && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-muted-foreground">
                                Nenhum vídeo aguardando revisão no momento.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Completed */}
                {project?.status === 'completed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-start gap-4">
                        <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-green-900 mb-2">
                                Projeto Concluído! 🎉
                            </h3>
                            <p className="text-green-700 mb-4">
                                Você aprovou o vídeo final. O pagamento foi processado para o editor.
                            </p>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => navigate(`/creator/project/${id}/rate`)}
                                disabled={hasReviewed}
                            >
                                {hasReviewed ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Você já avaliou este projeto
                                    </>
                                ) : (
                                    <>
                                        <Star className="w-4 h-4 mr-2" />
                                        Avaliar Editor
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Delivery History */}
                {deliveries.length > 0 && (
                    <DeliveryHistory deliveries={deliveries} userType="creator" />
                )}
            </div>
        </DashboardLayout>
    );
}

export default ReviewVideo;
