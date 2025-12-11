import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, MessageSquare, Play } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VideoPlayer } from '@/components/review/VideoPlayer';
import { CommentList } from '@/components/review/CommentList';
import { AddCommentForm } from '@/components/review/AddCommentForm';
import {
    getDeliveryComments,
    createComment,
    toggleCommentResolved,
    deleteComment,
    createReply,
    deleteReply,
    subscribeToDeliveryComments,
} from '@/services/deliveryService';
import type { DeliveryComment } from '@/types/delivery';

interface DeliveryData {
    id: string;
    project_id: string;
    video_url: string;
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

export default function AdminRevisionView() {
    const { projectId, version } = useParams();
    const navigate = useNavigate();
    const { admin } = useAdmin();
    const { toast } = useToast();

    const [delivery, setDelivery] = useState<DeliveryData | null>(null);
    const [comments, setComments] = useState<DeliveryComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (projectId && version && admin) {
            loadDeliveryData();
        }
    }, [projectId, version, admin]);

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

            // Buscar entrega pela versão
            const { data: deliveryData, error } = await supabase
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
                .eq('project_id', projectId)
                .eq('version', parseInt(version!))
                .single();

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
            navigate(`/admin/projects/${projectId}`);
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async (deliveryId: string) => {
        const commentsData = await getDeliveryComments(deliveryId);
        setComments(commentsData);
    };

    const handleAddComment = async (data: { content: string; timestampSeconds: number }) => {
        if (!delivery || !admin) return;

        // Criar comentário temporário para otimistic update
        const tempComment: DeliveryComment = {
            id: `temp-${Date.now()}`,
            delivery_id: delivery.id,
            author_id: admin.user_id,
            author_type: 'admin',
            content: data.content,
            timestamp_seconds: data.timestampSeconds,
            tag: null,
            is_resolved: false,
            resolved_by: null,
            resolved_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author: {
                full_name: admin.full_name || 'Admin',
                profile_photo_url: null
            },
            replies: []
        };

        // Adicionar imediatamente na lista (otimistic)
        setComments(prev => [...prev, tempComment].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));

        const { error } = await createComment({
            delivery_id: delivery.id,
            content: data.content,
            timestamp_seconds: data.timestampSeconds,
        }, 'admin');

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
        const { error } = await createReply({ comment_id: commentId, content }, 'admin');
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

    if (loading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <div className="h-[calc(100vh-250px)] flex gap-6">
                    <Skeleton className="flex-1 h-full" />
                    <Skeleton className="w-[400px] h-full" />
                </div>
            </div>
        );
    }

    if (!delivery) return null;

    const isReadOnly = delivery.status !== 'pending_review';
    const pendingComments = comments.filter(c => !c.is_resolved).length;
    const resolvedComments = comments.filter(c => c.is_resolved).length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => navigate(`/admin/projects/${projectId}`)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Revisão v{delivery.version}
                        </h1>
                        <p className="text-sm text-gray-500">{delivery.project?.title}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        className={
                            delivery.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : delivery.status === 'revision_requested' 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : 'bg-blue-100 text-blue-800'
                        }
                    >
                        {delivery.status === 'approved' && <><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</>}
                        {delivery.status === 'revision_requested' && <><CheckCircle className="h-3 w-3 mr-1" /> Revisado</>}
                        {delivery.status === 'pending_review' && <><MessageSquare className="h-3 w-3 mr-1" /> Em Revisão</>}
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
                            {new Date(delivery.submitted_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                    {delivery.description && (
                        <p className="text-sm text-muted-foreground max-w-md">{delivery.description}</p>
                    )}
                </div>
            </Card>

            {/* Feedback do Creator (se houver) */}
            {delivery.creator_feedback && (
                <Alert className="mb-4 border-orange-200 bg-orange-50">
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-800">Feedback do Creator</AlertTitle>
                    <AlertDescription className="text-orange-700">{delivery.creator_feedback}</AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <div className="h-[calc(100vh-350px)] flex gap-0 border rounded-lg overflow-hidden bg-white">
                {/* Left: Video + Comment Form */}
                <div className="flex-1 flex flex-col">
                    {/* Video Player */}
                    <div className="flex-1 p-4 bg-gray-900">
                        <div className="h-full rounded-lg overflow-hidden">
                            <VideoPlayer
                                key={`${delivery.video_type}-${delivery.video_url}`}
                                url={delivery.video_url}
                                videoType={delivery.video_type}
                                onTimeUpdate={setCurrentTime}
                                seekTo={seekTo}
                            />
                        </div>
                    </div>

                    {/* Add Comment Form - Admin sempre pode comentar */}
                    <div className="p-4 border-t bg-white">
                        <AddCommentForm
                            currentTime={currentTime}
                            videoType={delivery.video_type}
                            onSubmit={handleAddComment}
                        />
                    </div>
                </div>

                {/* Right: Comments */}
                <div className="w-[400px] border-l flex flex-col">
                    {/* Stats Header */}
                    <div className="p-4 border-b bg-gray-50">
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{comments.length}</p>
                                <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-600">{pendingComments}</p>
                                <p className="text-xs text-gray-500">Pendentes</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">{resolvedComments}</p>
                                <p className="text-xs text-gray-500">Resolvidos</p>
                            </div>
                        </div>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-hidden">
                        <CommentList
                            comments={comments}
                            videoType={delivery.video_type}
                            isReadOnly={false}
                            currentUserId={admin?.user_id}
                            onSeekTo={handleSeekTo}
                            onToggleResolved={handleToggleResolved}
                            onDelete={handleDeleteComment}
                            onAddReply={handleAddReply}
                            onDeleteReply={handleDeleteReply}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
