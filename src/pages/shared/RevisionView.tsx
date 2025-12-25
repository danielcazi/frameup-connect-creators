import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VideoPlayer } from '@/components/review/VideoPlayer';
import { CommentList } from '@/components/review/CommentList';
import { AddCommentForm } from '@/components/review/AddCommentForm';
import { ReviewPanel } from '@/components/creator/ReviewPanel';
import {
    getDeliveryComments,
    createComment,
    toggleCommentResolved,
    deleteComment,
    createReply,
    deleteReply,
    subscribeToDeliveryComments,
} from '@/services/deliveryService';
import type { DeliveryComment, CommentTag } from '@/types/delivery';
import { formatDateTime } from '@/utils/formatters';
import { DELIVERY_STATUS } from '@/constants/statusConstants';

interface DeliveryData {
    id: string;
    project_id: string;
    video_url: string;
    batch_video_id?: string | null; // 🆕 Added
    video_type: 'youtube' | 'gdrive';
    title: string | null;
    description: string | null;
    version: number;
    status: string;
    creator_feedback: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    project: {
        id: string;
        title: string;
        creator_id: string;
        assigned_editor_id: string;
    };
    editor: {
        full_name: string;
        profile_photo_url: string | null;
    };
}

export default function RevisionView() {
    const { id, version } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [delivery, setDelivery] = useState<DeliveryData | null>(null);
    const [comments, setComments] = useState<DeliveryComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [seekTo, setSeekTo] = useState<number | undefined>(undefined);
    const [userType, setUserType] = useState<'creator' | 'editor' | 'admin'>('editor');

    useEffect(() => {
        if (id && version && user) {
            loadDeliveryData();
        }
    }, [id, version, user]);

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

            // Buscar versão correta, considerando se é lote ou não
            const searchParams = new URLSearchParams(window.location.search);
            const batchVideoId = searchParams.get('video');

            let query = supabase
                .from('project_deliveries')
                .select(`
                    *,
                    project:projects (
                        id, 
                        title, 
                        creator_id, 
                        assigned_editor_id
                    )
                `)
                .eq('project_id', id)
                .eq('version', parseInt(version!));

            // Filtro específico para Lote vs Projeto Único
            if (batchVideoId) {
                query = query.eq('batch_video_id', batchVideoId);
            } else {
                // Se não tem vídeo id, garante que não pegue entregas de lote perdidas (ou assume single)
                // Para compatibilidade, se não passar ID, tenta pegar onde batch_video_id é null 
                // OU aceita qualquer um se não houver conflito (mas melhor ser estrito)
                query = query.is('batch_video_id', null);
            }

            const { data: deliveryData, error } = await query.single();

            if (error) throw error;

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
            const isEditor = deliveryData.project?.assigned_editor_id === user?.id;

            // Verificar se é admin
            const { data: adminData } = await supabase
                .from('admin_users')
                .select('id')
                .eq('user_id', user?.id)
                .eq('is_active', true)
                .maybeSingle();

            const isAdmin = !!adminData;

            if (!isCreator && !isEditor && !isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Você não tem permissão para acessar esta revisão.'
                });
                navigate('/');
                return;
            }

            // Definir tipo de usuário
            if (isAdmin) setUserType('admin');
            else if (isCreator) setUserType('creator');
            else setUserType('editor');

            // Montar objeto com dados do editor
            const deliveryWithEditor = {
                ...deliveryData,
                editor: editorData || { full_name: 'Editor', profile_photo_url: null }
            };

            setDelivery(deliveryWithEditor as unknown as DeliveryData);
            await loadComments(deliveryData.id);
        } catch (error) {
            console.error('Error loading delivery:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Revisão não encontrada.'
            });
            navigate(-1);
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
            author_type: userType,
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
        }, userType);

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
        // Optimistic update
        setComments(currentComments =>
            currentComments.map(c =>
                c.id === commentId
                    ? { ...c, is_resolved: !c.is_resolved }
                    : c
            )
        );

        try {
            await toggleCommentResolved(commentId);
        } catch (error) {
            console.error('Error toggling comment resolved:', error);
            // Revert on error
            setComments(currentComments =>
                currentComments.map(c =>
                    c.id === commentId
                        ? { ...c, is_resolved: !c.is_resolved }
                        : c
                )
            );
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível atualizar o status do comentário.'
            });
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        await deleteComment(commentId);
    };

    const handleAddReply = async (commentId: string, content: string) => {
        const { error } = await createReply({ comment_id: commentId, content }, userType);
        if (error) {
            toast({ variant: 'destructive', title: 'Erro', description: error });
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        await deleteReply(replyId);
    };

    const handleSeekTo = useCallback((time: number) => {
        setSeekTo(time);
    }, []);

    const getBackUrl = () => {
        if (userType === 'creator') return `/creator/project/${id}`;
        if (userType === 'editor') return `/editor/project/${id}`;
        return `/admin/projects`;
    };

    if (loading) {
        return (
            <DashboardLayout
                userType={userType}
                title="Visualizar Revisão"
                subtitle="Carregando..."
            >
                <div className="h-[calc(100vh-200px)] flex gap-6">
                    <Skeleton className="flex-1 h-full" />
                    <Skeleton className="w-[450px] h-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!delivery) return null;

    const isReadOnly = delivery.status !== DELIVERY_STATUS.PENDING_REVIEW;
    // Permitir se não for admin, ou se for editor trabalhando na revisão
    const canComment = !isReadOnly || (userType === 'editor' && delivery.status === DELIVERY_STATUS.REVISION_REQUESTED) || userType === 'admin';

    return (
        <DashboardLayout
            userType={userType}
            title={`Revisão v${delivery.version}`}
            subtitle={delivery.project?.title}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <Button type="button" variant="ghost" onClick={() => navigate(getBackUrl())}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Projeto
                </Button>

                <div className="flex items-center gap-3">
                    <Badge
                        variant={
                            delivery.status === DELIVERY_STATUS.APPROVED ? 'default' :
                                delivery.status === DELIVERY_STATUS.REVISION_REQUESTED ? 'destructive' :
                                    'secondary'
                        }
                        className="flex items-center gap-1"
                    >
                        {delivery.status === DELIVERY_STATUS.APPROVED && <><CheckCircle className="h-3 w-3" /> Aprovado</>}
                        {delivery.status === DELIVERY_STATUS.REVISION_REQUESTED && <><CheckCircle className="h-3 w-3" /> Revisado ✓</>}
                        {delivery.status === DELIVERY_STATUS.PENDING_REVIEW && <><MessageSquare className="h-3 w-3" /> Em Revisão</>}
                    </Badge>

                    {isReadOnly && (
                        <Badge variant="outline" className="flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Modo Leitura
                        </Badge>
                    )}
                </div>
            </div>

            {/* Info Card */}
            <Card className="p-4 mb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold">{delivery.title || `Entrega v${delivery.version}`}</h3>
                        <p className="text-sm text-muted-foreground">
                            Enviado por {delivery.editor?.full_name} em{' '}
                            {formatDateTime(delivery.submitted_at)}
                        </p>
                    </div>
                    {delivery.description && (
                        <p className="text-sm text-muted-foreground max-w-md">{delivery.description}</p>
                    )}
                </div>
            </Card>

            {/* Feedback do Creator (se houver) */}
            {delivery.creator_feedback && (
                <Alert className="mb-4" variant={delivery.status === 'approved' ? 'default' : 'destructive'}>
                    <MessageSquare className="h-4 w-4" />
                    <AlertTitle>Feedback do Creator</AlertTitle>
                    <AlertDescription>{delivery.creator_feedback}</AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <div className="h-[calc(100vh-380px)] flex gap-0 border rounded-lg overflow-hidden">
                {/* Left: Video + Comment Form */}
                <div className="flex-1 flex flex-col bg-background">
                    {/* Video Player */}
                    <div className="flex-1 p-4">
                        <div className="h-full bg-black rounded-lg overflow-hidden">
                            <VideoPlayer
                                key={`${delivery.video_type}-${delivery.video_url}`}
                                url={delivery.video_url}
                                videoType={delivery.video_type}
                                onTimeUpdate={setCurrentTime}
                                seekTo={seekTo}
                            />
                        </div>
                    </div>

                    {/* Add Comment Form */}
                    {canComment && (
                        <div className="p-4 border-t">
                            <AddCommentForm
                                currentTime={currentTime}
                                videoType={delivery.video_type}
                                onSubmit={handleAddComment}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Comments */}
                <div className="w-[450px]">
                    <CommentList
                        comments={comments}
                        videoType={delivery.video_type}
                        isReadOnly={!canComment}
                        currentUserId={user?.id}
                        onSeekTo={handleSeekTo}
                        onToggleResolved={handleToggleResolved}
                        onDelete={handleDeleteComment}
                        onAddReply={handleAddReply}
                        onDeleteReply={handleDeleteReply}
                    />
                </div>
            </div>

            {/* Ações de Revisão (Apenas Creator) */}
            {userType === 'creator' && delivery.status === DELIVERY_STATUS.PENDING_REVIEW && (
                <div className="mt-8">
                    <ReviewPanel
                        projectId={delivery.project_id}
                        isBatch={!!delivery.batch_video_id} // Pass correct batch mode
                        batchVideo={{
                            id: delivery.batch_video_id || '',
                            sequence_order: 1, // Fallback if missing
                            title: delivery.title || delivery.project.title,
                            revision_count: delivery.version - 1,
                            paid_extra_revisions: false, // Need to pipe this if relevant
                        }}
                        delivery={{
                            id: delivery.id,
                            video_url: delivery.video_url,
                            notes: delivery.description || undefined,
                            version: delivery.version, // Ensure version is passed if ReviewPanel needs it
                            delivered_at: delivery.submitted_at
                        }}
                        editorEarningsPerVideo={0} // Ocultar ou passar se disponível. ReviewPanel uses it for display messages.
                        editorName={delivery.editor?.full_name}
                        onUpdate={() => {
                            // Reload delivery data to update status
                            loadDeliveryData();
                        }}
                    />
                </div>
            )}
        </DashboardLayout>
    );
}
