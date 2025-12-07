import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, MessageSquare, Lock, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { VideoPlayer, CommentList, AddCommentForm } from '@/components/review';
import {
    getDeliveryById,
    getDeliveryComments,
    createComment,
    toggleCommentResolved,
    deleteComment,
    createReply,
    deleteReply,
    approveDelivery,
    requestRevision,
    subscribeToDeliveryComments,
} from '@/services/deliveryService';
import type { DeliveryWithDetails, DeliveryComment, CommentTag } from '@/types/delivery';

export default function ReviewDelivery() {
    const { id } = useParams(); // project id
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [delivery, setDelivery] = useState<DeliveryWithDetails | null>(null);
    const [comments, setComments] = useState<DeliveryComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

    // Modal states
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRevisionDialog, setShowRevisionDialog] = useState(false);
    const [approveFeedback, setApproveFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (id && user) {
            loadDeliveryData();
        }
    }, [id, user]);

    // Realtime subscription
    useEffect(() => {
        if (!delivery?.id) return;

        const unsubscribe = subscribeToDeliveryComments(delivery.id, () => {
            loadComments(delivery.id);
        });

        return unsubscribe;
    }, [delivery?.id]);

    const loadDeliveryData = async () => {
        try {
            setLoading(true);

            // Buscar última entrega do projeto - SEM o join direto com users
            const { data: deliveryData, error } = await supabase
                .from('project_deliveries')
                .select(`
                    *,
                    project:projects (
                        id, 
                        title, 
                        creator_id, 
                        assigned_editor_id,
                        current_revision, 
                        max_free_revisions
                    )
                `)
                .eq('project_id', id)
                .eq('status', 'pending_review')
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (!deliveryData) {
                toast({
                    variant: 'destructive',
                    title: 'Nenhuma entrega pendente',
                    description: 'Não há vídeos aguardando sua revisão neste projeto.'
                });
                navigate(`/creator/project/${id}`);
                return;
            }

            // Buscar dados do editor separadamente
            let editorData = null;
            if (deliveryData.editor_id) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('full_name, profile_photo_url')
                    .eq('id', deliveryData.editor_id)
                    .single();

                editorData = userData;
            }

            // Verificar acesso
            const isCreator = deliveryData.project?.creator_id === user?.id;
            // const isEditor = deliveryData.project?.assigned_editor_id === user?.id; // Editor não revisa

            // Verificar se é admin
            const { data: adminData } = await supabase
                .from('admin_users')
                .select('id')
                .eq('user_id', user?.id)
                .eq('is_active', true)
                .maybeSingle();

            const isAdmin = !!adminData;

            if (!isCreator && !isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Você não tem permissão para acessar esta página.'
                });
                navigate('/');
                return;
            }

            // Montar objeto com dados do editor
            const deliveryWithEditor = {
                ...deliveryData,
                editor: editorData || { full_name: 'Editor', profile_photo_url: null }
            };

            setDelivery(deliveryWithEditor as unknown as DeliveryWithDetails);
            await loadComments(deliveryData.id);
        } catch (error) {
            console.error('Error loading delivery:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar a revisão.'
            });
            navigate(`/creator/project/${id}`);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (deliveryId: string) => {
        const commentsData = await getDeliveryComments(deliveryId);
        setComments(commentsData);
    };

    const handleAddComment = async (data: { content: string; timestampSeconds: number }) => {
        if (!delivery || !user) return;

        // Criar comentário temporário para otimistic update
        const tempComment: DeliveryComment = {
            id: `temp-${Date.now()}`,
            delivery_id: delivery.id,
            author_id: user.id,
            author_type: 'creator',
            content: data.content,
            timestamp_seconds: data.timestampSeconds,
            tag: null,
            is_resolved: false,
            resolved_by: null,
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: {
                full_name: user.user_metadata?.full_name || 'Você',
                profile_photo_url: user.user_metadata?.avatar_url || null
            },
            replies: []
        };

        // Adicionar imediatamente na lista (otimistic)
        setComments(prev => [...prev, tempComment].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));

        const { error } = await createComment({
            delivery_id: delivery.id,
            content: data.content,
            timestamp_seconds: data.timestampSeconds,
        }, 'creator');

        if (error) {
            // Remover comentário temporário em caso de erro
            setComments(prev => prev.filter(c => c.id !== tempComment.id));
            toast({ variant: 'destructive', title: 'Erro', description: error });
        } else {
            // Recarregar para pegar o ID real do servidor
            await loadComments(delivery.id);
        }
    };

    const handleToggleResolved = async (commentId: string) => {
        await toggleCommentResolved(commentId);
    };

    const handleDeleteComment = async (commentId: string) => {
        await deleteComment(commentId);
    };

    const handleAddReply = async (commentId: string, content: string) => {
        const { error } = await createReply({ comment_id: commentId, content }, 'creator');
        if (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error });
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        await deleteReply(replyId);
    };

    const handleApprove = async () => {
        if (!delivery) return;
        setSubmitting(true);

        try {
            const { success, error } = await approveDelivery(delivery.id, approveFeedback || undefined);
            if (!success) throw new Error(error || 'Erro ao aprovar');

            toast({ title: 'Vídeo Aprovado!', description: 'O projeto foi concluído e o pagamento será liberado ao editor.' });
            navigate(`/creator/project/${id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setSubmitting(false);
            setShowApproveDialog(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!delivery) return;

        // Verificar se há comentários pendentes
        const pendingComments = comments.filter(c => !c.is_resolved);
        if (pendingComments.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Nenhuma correção',
                description: 'Adicione pelo menos um comentário antes de solicitar correções.'
            });
            return;
        }

        setSubmitting(true);
        try {
            // Enviar sem feedback obrigatório (as correções estão nos comentários)
            const { success, error } = await requestRevision(delivery.id, `${pendingComments.length} correções solicitadas`);
            if (!success) throw new Error(error || 'Erro ao solicitar correções');

            toast({ title: 'Correções Solicitadas', description: 'O editor foi notificado sobre as correções necessárias.' });
            navigate(`/creator/project/${id}`);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro', description: error.message });
        } finally {
            setSubmitting(false);
            setShowRevisionDialog(false);
        }
    };

    const handleSeekTo = useCallback((time: number) => {
        setSeekTo(time);
    }, []);

    if (loading) {
        return (
            <DashboardLayout userType="creator" title="Revisar Entrega" subtitle="Carregando...">
                <div className="h-[calc(100vh-200px)] flex gap-6">
                    <Skeleton className="flex-1 h-full" />
                    <Skeleton className="w-[450px] h-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!delivery) return null;

    const isReadOnly = delivery.status !== 'pending_review';
    const pendingComments = comments.filter(c => !c.is_resolved).length;
    const isCreator = delivery.project?.creator_id === user?.id;

    return (
        <DashboardLayout
            userType="creator"
            title={`Revisar Entrega - v${delivery.version}`}
            subtitle={delivery.project?.title}
        >
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6">
                <Button type="button" variant="ghost" onClick={() => navigate(`/creator/project/${id}`)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Projeto
                </Button>

                {!isReadOnly && isCreator && (
                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowRevisionDialog(true)}
                            className="border-amber-500 text-amber-600 hover:bg-amber-50"
                        >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Solicitar Correções
                        </Button>
                        <Button
                            type="button"
                            onClick={() => setShowApproveDialog(true)}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar Vídeo
                        </Button>
                    </div>
                )}

                {isReadOnly && (
                    <Badge variant={delivery.status === 'approved' ? 'default' : 'secondary'} className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {delivery.status === 'approved' ? 'Aprovado' : 'Correções Solicitadas'} - Modo Leitura
                    </Badge>
                )}
            </div>

            {/* Info Alert */}
            {!isReadOnly && pendingComments > 0 && (
                <Alert className="mb-4">
                    <MessageSquare className="h-4 w-4" />
                    <AlertTitle>Comentários Pendentes</AlertTitle>
                    <AlertDescription>
                        Você tem {pendingComments} comentário(s) não resolvido(s). Revise antes de finalizar.
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <div className="h-[calc(100vh-280px)] flex gap-0 border rounded-lg overflow-hidden">
                {/* Left: Video + Comment Form */}
                <div className="flex-1 flex flex-col bg-background">
                    {/* Video Player */}
                    <div className="flex-1 p-4">
                        <div className="h-full bg-black rounded-lg overflow-hidden">
                            <VideoPlayer
                                key={`${delivery.video_type}-${delivery.video_url}`}
                                url={delivery.video_url}
                                videoType={delivery.video_type as 'youtube' | 'gdrive'}
                                onTimeUpdate={setCurrentTime}
                                seekTo={seekTo}
                            />
                        </div>
                    </div>

                    {/* Add Comment Form */}
                    {!isReadOnly && (
                        <div className="p-4 border-t">
                            <AddCommentForm
                                currentTime={currentTime}
                                videoType={delivery.video_type as 'youtube' | 'gdrive'}
                                onSubmit={handleAddComment}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Comments */}
                <div className="w-[450px]">
                    <CommentList
                        comments={comments}
                        videoType={delivery.video_type as 'youtube' | 'gdrive'}
                        isReadOnly={isReadOnly}
                        currentUserId={user?.id}
                        onSeekTo={handleSeekTo}
                        onToggleResolved={handleToggleResolved}
                        onDelete={handleDeleteComment}
                        onAddReply={handleAddReply}
                        onDeleteReply={handleDeleteReply}
                    />
                </div>
            </div>

            {/* Approve Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            Aprovar Vídeo
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Ao aprovar, o projeto será marcado como concluído e o pagamento será liberado ao editor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Feedback para o editor (opcional)..."
                            value={approveFeedback}
                            onChange={(e) => setApproveFeedback(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApprove} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                            {submitting ? 'Aprovando...' : 'Confirmar Aprovação'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Revision Dialog */}
            <AlertDialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertCircle className="h-5 w-5" />
                            Solicitar Correções
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                            Revise o vídeo por completo e anote todas as alterações necessárias.
                            <br /><br />
                            <strong className="text-destructive">
                                Depois de clicar em "Enviar Solicitação" você não pode mais alterar.
                            </strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                            📝 Suas correções estão registradas nos <strong>{comments.filter(c => !c.is_resolved).length}</strong> comentários pendentes.
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRequestRevision}
                            disabled={submitting}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DashboardLayout>
    );
}
