// ============================================
// TIPOS DO SISTEMA DE REVISÃO DE VÍDEOS
// ============================================

export type DeliveryStatus =
    | 'pending_review'
    | 'approved'
    | 'revision_requested'
    | 'cancelled';

export type DeliveryVideoType = 'youtube' | 'gdrive';

export type CommentTag =
    | 'correction'
    | 'suggestion'
    | 'approved'
    | 'question'
    | 'praise';

export type AuthorType = 'creator' | 'editor' | 'admin';

// ============================================
// INTERFACES PRINCIPAIS
// ============================================

export interface ProjectDelivery {
    id: string;
    project_id: string;
    editor_id: string;
    video_url: string;
    video_type: DeliveryVideoType;
    title: string | null;
    description: string | null;
    version: number;
    status: DeliveryStatus;
    creator_feedback: string | null;
    is_paid_revision: boolean;
    revision_price: number | null;
    submitted_at: string;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface DeliveryComment {
    id: string;
    delivery_id: string;
    author_id: string;
    author_type: AuthorType;
    content: string;
    timestamp_seconds: number;
    tag: CommentTag | null;
    is_resolved: boolean;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
    // Campos join
    author?: {
        full_name: string;
        profile_photo_url: string | null;
    };
    replies?: DeliveryCommentReply[];
}

export interface DeliveryCommentReply {
    id: string;
    comment_id: string;
    author_id: string;
    author_type: AuthorType;
    content: string;
    created_at: string;
    // Campos join
    author?: {
        full_name: string;
        profile_photo_url: string | null;
    };
}

// ============================================
// INTERFACES DE INPUT/CRIAÇÃO
// ============================================

export interface CreateDeliveryInput {
    project_id: string;
    video_url: string;
    video_type: DeliveryVideoType;
    title?: string;
    description?: string;
}

export interface CreateCommentInput {
    delivery_id: string;
    content: string;
    timestamp_seconds: number;
    tag?: CommentTag;
}

export interface CreateReplyInput {
    comment_id: string;
    content: string;
}

// ============================================
// INTERFACES DE RESPOSTA
// ============================================

export interface DeliveryWithDetails extends ProjectDelivery {
    project?: {
        id: string;
        title: string;
        creator_id: string;
        assigned_editor_id: string;
        current_revision: number;
        max_free_revisions: number;
    };
    editor?: {
        full_name: string;
        profile_photo_url: string | null;
    };
    comments_count?: number;
    pending_comments_count?: number;
}

// ============================================
// HELPERS
// ============================================

export const TAG_LABELS: Record<CommentTag, { label: string; emoji: string; color: string }> = {
    correction: { label: 'Correção', emoji: '🔧', color: 'destructive' },
    suggestion: { label: 'Sugestão', emoji: '💡', color: 'warning' },
    approved: { label: 'Aprovado', emoji: '✅', color: 'success' },
    question: { label: 'Dúvida', emoji: '❓', color: 'info' },
    praise: { label: 'Elogio', emoji: '👏', color: 'primary' },
};

export const STATUS_LABELS: Record<DeliveryStatus, { label: string; color: string }> = {
    pending_review: { label: 'Aguardando Revisão', color: 'warning' },
    approved: { label: 'Aprovado', color: 'success' },
    revision_requested: { label: 'Correções Solicitadas', color: 'destructive' },
    cancelled: { label: 'Cancelado', color: 'muted' },
};

export function formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':');
    if (parts.length === 2) {
        const mins = parseInt(parts[0]) || 0;
        const secs = parseInt(parts[1]) || 0;
        return mins * 60 + secs;
    }
    return 0;
}
