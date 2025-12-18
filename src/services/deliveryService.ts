import { supabase } from '@/lib/supabase';
import type {
    ProjectDelivery,
    DeliveryComment,
    DeliveryCommentReply,
    DeliveryWithDetails,
    CreateDeliveryInput,
    CreateCommentInput,
    CreateReplyInput,
    DeliveryVideoType,
} from '@/types/delivery';

// ============================================
// FUNÇÕES DE URL
// ============================================

export function convertGoogleDriveUrl(url: string): string {
    const fileIdMatch = url.match(/\/d\/([^\/]+)/);
    if (fileIdMatch) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    return url;
}

export function detectVideoType(url: string): { type: DeliveryVideoType | null; url: string; isValid: boolean; error?: string } {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return { type: 'youtube', url, isValid: true };
    }

    // Google Drive
    if (url.includes('drive.google.com')) {
        if (url.includes('/folders/')) {
            return {
                type: null,
                url,
                isValid: false,
                error: 'Use o link de um arquivo de vídeo, não de uma pasta'
            };
        }

        if (url.includes('/file/d/')) {
            return { type: 'gdrive', url: convertGoogleDriveUrl(url), isValid: true };
        }
    }

    return { type: null, url, isValid: false, error: 'URL não suportada. Use YouTube ou Google Drive.' };
}

export function getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
}

// ============================================
// ENTREGAS
// ============================================

export async function createDelivery(input: CreateDeliveryInput): Promise<{ delivery: ProjectDelivery | null; error: string | null }> {
    try {
        // Validar URL
        const validation = detectVideoType(input.video_url);
        if (!validation.isValid || !validation.type) {
            return { delivery: null, error: validation.error || 'URL inválida' };
        }

        const { data, error } = await supabase.rpc('create_delivery', {
            p_project_id: input.project_id,
            p_video_url: validation.url,
            p_video_type: validation.type,
            p_title: input.title || null,
            p_description: input.description || null,
            p_batch_video_id: input.batch_video_id || null,
        });

        if (error) throw error;

        // Buscar a entrega criada
        const { data: delivery, error: fetchError } = await supabase
            .from('project_deliveries')
            .select('*')
            .eq('id', data)
            .single();

        if (fetchError) throw fetchError;

        // A RPC create_delivery já atualiza o status corretamente para 'in_review' (v1) ou 'pending_approval' (v2+)

        return { delivery, error: null };
    } catch (error: any) {
        console.error('Error creating delivery:', error);
        return { delivery: null, error: error.message || 'Erro ao criar entrega' };
    }
}

export async function getDeliveryById(deliveryId: string): Promise<ProjectDelivery | null> {
    const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single();

    if (error) {
        console.error('Error fetching delivery:', error);
        return null;
    }

    return data;
}

export async function getProjectDeliveries(projectId: string): Promise<ProjectDelivery[]> {
    const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });

    if (error) {
        console.error('Error fetching deliveries:', error);
        return [];
    }

    return data || [];
}

export async function getLatestDelivery(projectId: string): Promise<ProjectDelivery | null> {
    const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching latest delivery:', error);
        return null;
    }

    return data;
}

export async function approveDelivery(deliveryId: string, feedback?: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase.rpc('approve_delivery', {
            p_delivery_id: deliveryId,
            p_feedback: feedback || null,
        });

        if (error) throw error;

        // Approve usually sets to 'completed' via RPC, but let's enforce if needed.
        // Assuming RPC handles 'completed' correctly or 'approved'.

        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error approving delivery:', error);
        return { success: false, error: error.message || 'Erro ao aprovar entrega' };
    }
}

export async function requestRevision(deliveryId: string, feedback: string, targetStatus: 'revision_requested' | 'in_progress' = 'revision_requested'): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase.rpc('request_revision', {
            p_delivery_id: deliveryId,
            p_feedback: feedback,
        });

        if (error) throw error;

        // Atualizar status do projeto
        // Precisamos do project_id, então buscamos a delivery primeiro ou assumimos que o RPC já faz.

        // Buscar delivery para pegar project_id
        const { data: delivery } = await supabase
            .from('project_deliveries')
            .select('project_id')
            .eq('id', deliveryId)
            .single();

        if (delivery) {
            const { error: updateError } = await supabase
                .from('projects')
                .update({ status: targetStatus })
                .eq('id', delivery.project_id);

            if (updateError) console.error(`Error updating status to ${targetStatus}:`, updateError);
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error('Error requesting revision:', error);
        return { success: false, error: error.message || 'Erro ao solicitar revisão' };
    }
}

// ============================================
// COMENTÁRIOS
// ============================================

export async function getDeliveryComments(deliveryId: string): Promise<DeliveryComment[]> {
    try {
        const { data: comments, error: commentsError } = await supabase
            .from('delivery_comments')
            .select('*')
            .eq('delivery_id', deliveryId)
            .order('timestamp_seconds', { ascending: true });

        if (commentsError) throw commentsError;

        if (!comments || comments.length === 0) return [];

        // Buscar replies
        const commentIds = comments.map(c => c.id);
        const { data: replies, error: repliesError } = await supabase
            .from('delivery_comment_replies')
            .select('*')
            .in('comment_id', commentIds)
            .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Coletar IDs de autores para buscar perfis
        const authorIds = new Set<string>();
        comments.forEach(c => authorIds.add(c.author_id));
        replies?.forEach(r => authorIds.add(r.author_id));

        // Buscar perfis dos autores
        const { data: authors } = await supabase
            .from('users')
            .select('id, full_name, profile_photo_url')
            .in('id', Array.from(authorIds));

        const authorsMap = new Map(authors?.map(a => [a.id, a]) || []);

        // Agrupar replies por comentário e anexar autores
        const repliesByComment: Record<string, DeliveryCommentReply[]> = {};
        (replies || []).forEach(reply => {
            if (!repliesByComment[reply.comment_id]) {
                repliesByComment[reply.comment_id] = [];
            }
            repliesByComment[reply.comment_id].push({
                ...reply,
                author: authorsMap.get(reply.author_id)
            } as DeliveryCommentReply);
        });

        // Adicionar replies e autores aos comentários
        return comments.map(comment => ({
            ...comment,
            author: authorsMap.get(comment.author_id),
            replies: repliesByComment[comment.id] || [],
        })) as DeliveryComment[];
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}

export async function createComment(
    input: CreateCommentInput,
    authorType: 'creator' | 'editor' | 'admin'
): Promise<{ comment: DeliveryComment | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data, error } = await supabase
            .from('delivery_comments')
            .insert({
                delivery_id: input.delivery_id,
                author_id: user.id,
                author_type: authorType,
                content: input.content,
                timestamp_seconds: input.timestamp_seconds,
                tag: input.tag || null,
            })
            .select('*')
            .single();

        if (error) throw error;

        // Buscar perfil do autor
        const { data: authorProfile } = await supabase
            .from('users')
            .select('full_name, profile_photo_url')
            .eq('id', user.id)
            .single();

        const commentWithAuthor = {
            ...data,
            author: authorProfile
        };

        return { comment: commentWithAuthor as DeliveryComment, error: null };
    } catch (error: any) {
        console.error('Error creating comment:', error);
        return { comment: null, error: error.message || 'Erro ao criar comentário' };
    }
}

export async function toggleCommentResolved(commentId: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        // Buscar estado atual
        const { data: comment } = await supabase
            .from('delivery_comments')
            .select('is_resolved')
            .eq('id', commentId)
            .single();

        if (!comment) throw new Error('Comentário não encontrado');

        const newResolved = !comment.is_resolved;

        const { error } = await supabase
            .from('delivery_comments')
            .update({
                is_resolved: newResolved,
                resolved_by: newResolved ? user.id : null,
                resolved_at: newResolved ? new Date().toISOString() : null,
            })
            .eq('id', commentId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error toggling comment resolved:', error);
        return false;
    }
}

export async function deleteComment(commentId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('delivery_comments')
            .delete()
            .eq('id', commentId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting comment:', error);
        return false;
    }
}

// ============================================
// RESPOSTAS
// ============================================

export async function createReply(
    input: CreateReplyInput,
    authorType: 'creator' | 'editor' | 'admin'
): Promise<{ reply: DeliveryCommentReply | null; error: string | null }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const { data, error } = await supabase
            .from('delivery_comment_replies')
            .insert({
                comment_id: input.comment_id,
                author_id: user.id,
                author_type: authorType,
                content: input.content,
            })
            .select('*')
            .single();

        if (error) throw error;

        // Buscar perfil do autor
        const { data: authorProfile } = await supabase
            .from('users')
            .select('full_name, profile_photo_url')
            .eq('id', user.id)
            .single();

        const replyWithAuthor = {
            ...data,
            author: authorProfile
        };

        return { reply: replyWithAuthor as DeliveryCommentReply, error: null };
    } catch (error: any) {
        console.error('Error creating reply:', error);
        return { reply: null, error: error.message || 'Erro ao criar resposta' };
    }
}

export async function deleteReply(replyId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('delivery_comment_replies')
            .delete()
            .eq('id', replyId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting reply:', error);
        return false;
    }
}

// ============================================
// REALTIME SUBSCRIPTIONS
// ============================================

export function subscribeToDeliveryComments(
    deliveryId: string,
    onUpdate: () => void
) {
    const channel = supabase
        .channel(`delivery-comments-${deliveryId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'delivery_comments',
                filter: `delivery_id=eq.${deliveryId}`,
            },
            () => onUpdate()
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'delivery_comment_replies',
            },
            () => onUpdate()
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
