import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export type NotificationType =
    | 'new_project'
    | 'new_application'
    | 'application_accepted'
    | 'application_rejected'
    | 'new_message'
    | 'video_delivered'
    | 'video_approved'
    | 'revision_requested'
    | 'new_review'
    | 'subscription_warning'
    | 'subscription_expired'
    | 'editor_approved'
    | 'editor_rejected'
    | 'new_favorite'
    | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    reference_id?: string;
    data?: {
        project_id?: string;
        project_title?: string;
        editor_id?: string;
        editor_name?: string;
        creator_id?: string;
        creator_name?: string;
        application_id?: string;
        review_id?: string;
        rating?: number;
        [key: string]: any;
    };
    is_read: boolean;
    is_archived: boolean;
    read_at?: string;
    archived_at?: string;
    action_url?: string;
    created_at: string;
    expires_at?: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    // Tipos de notificação
    application_accepted: boolean;
    application_rejected: boolean;
    new_message: boolean;
    project_assigned: boolean;
    delivery_feedback: boolean;
    payment_received: boolean;
    new_favorite: boolean;
    new_projects_digest: boolean;
    // Canais
    channel_in_app: boolean;
    channel_email: boolean;
    channel_push: boolean;
    // Frequência
    email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    digest_hour: number;
    // Timestamps
    created_at: string;
    updated_at: string;
}

// ================================================
// BUSCAR NOTIFICAÇÕES
// ================================================

export type NotificationFilter = 'all' | 'unread' | 'archived';

export async function getNotifications(
    limit: number = 20,
    offset: number = 0,
    filter: NotificationFilter = 'all',
    includeArchived: boolean = false
): Promise<Notification[]> {
    try {
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filtros baseados no tipo
        if (filter === 'unread') {
            query = query.eq('is_read', false).eq('is_archived', false);
        } else if (filter === 'archived') {
            query = query.eq('is_archived', true);
        } else if (!includeArchived) {
            // 'all' mas sem arquivadas (para dropdown)
            query = query.eq('is_archived', false);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data as Notification[]) || [];
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        throw error;
    }
}

// Buscar apenas não arquivadas (para dropdown do sino)
export async function getActiveNotifications(
    limit: number = 20,
    offset: number = 0
): Promise<Notification[]> {
    return getNotifications(limit, offset, 'all', false);
}

// Buscar arquivadas (para histórico)
export async function getArchivedNotifications(
    limit: number = 20,
    offset: number = 0
): Promise<Notification[]> {
    return getNotifications(limit, offset, 'archived', true);
}

// ================================================
// CONTADORES
// ================================================

export async function getUnreadCount(): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false)
            .eq('is_archived', false);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Erro ao contar notificações:', error);
        return 0;
    }
}

export async function getArchivedCount(): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_archived', true);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Erro ao contar arquivadas:', error);
        return 0;
    }
}

// ================================================
// MARCAR COMO LIDA
// ================================================

export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        throw error;
    }
}

export async function markAllAsRead(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('mark_all_notifications_read');

        if (error) {
            // Fallback se a função RPC não existir
            const { error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('is_read', false);

            if (updateError) throw updateError;
            return 0;
        }
        return data || 0;
    } catch (error) {
        console.error('Erro ao marcar todas como lidas:', error);
        throw error;
    }
}

// ================================================
// ARQUIVAMENTO
// ================================================

export async function archiveNotification(notificationId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_archived: true,
                archived_at: new Date().toISOString(),
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao arquivar notificação:', error);
        throw error;
    }
}

export async function archiveAllRead(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('archive_read_notifications', {
            p_user_id: (await supabase.auth.getUser()).data.user?.id
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Erro ao arquivar notificações lidas:', error);
        throw error;
    }
}

export async function markAllReadAndArchive(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('mark_all_read_and_archive', {
            p_user_id: (await supabase.auth.getUser()).data.user?.id
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Erro ao marcar e arquivar:', error);
        throw error;
    }
}

export async function unarchiveNotification(notificationId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_archived: false,
                archived_at: null
            })
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao desarquivar notificação:', error);
        throw error;
    }
}

// ================================================
// DELETAR NOTIFICAÇÃO
// ================================================

export async function deleteNotification(notificationId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao deletar notificação:', error);
        throw error;
    }
}

// ================================================
// PREFERÊNCIAS
// ================================================

export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar preferências:', error);
        throw error;
    }
}

export async function updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
): Promise<boolean> {
    try {
        const userId = (await supabase.auth.getUser()).data.user?.id;

        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                ...preferences,
                updated_at: new Date().toISOString(),
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao atualizar preferências:', error);
        throw error;
    }
}

// ================================================
// HELPERS
// ================================================

export function getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
        new_project: '📁',
        new_application: '📨',
        application_accepted: '✅',
        application_rejected: '❌',
        new_message: '💬',
        video_delivered: '🎬',
        video_approved: '🎉',
        revision_requested: '🔄',
        new_review: '⭐',
        subscription_warning: '⚠️',
        subscription_expired: '🚫',
        editor_approved: '🎊',
        editor_rejected: '😔',
        new_favorite: '💛',
        system: '🔔',
    };
    return icons[type] || '🔔';
}

export function getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
        new_project: 'bg-blue-100 text-blue-800',
        new_application: 'bg-purple-100 text-purple-800',
        application_accepted: 'bg-green-100 text-green-800',
        application_rejected: 'bg-red-100 text-red-800',
        new_message: 'bg-indigo-100 text-indigo-800',
        video_delivered: 'bg-cyan-100 text-cyan-800',
        video_approved: 'bg-green-100 text-green-800',
        revision_requested: 'bg-yellow-100 text-yellow-800',
        new_review: 'bg-amber-100 text-amber-800',
        subscription_warning: 'bg-orange-100 text-orange-800',
        subscription_expired: 'bg-red-100 text-red-800',
        editor_approved: 'bg-green-100 text-green-800',
        editor_rejected: 'bg-red-100 text-red-800',
        new_favorite: 'bg-yellow-100 text-yellow-800',
        system: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
}

export function formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
