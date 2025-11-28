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
    | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
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
    read_at?: string;
    action_url?: string;
    created_at: string;
    expires_at?: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_new_project: boolean;
    email_new_application: boolean;
    email_application_status: boolean;
    email_new_message: boolean;
    email_video_delivered: boolean;
    email_video_status: boolean;
    email_new_review: boolean;
    email_subscription: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
}

// ================================================
// BUSCAR NOTIFICAÇÕES
// ================================================

export async function getNotifications(
    limit: number = 20,
    offset: number = 0,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    try {
        let query = supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data, error } = await query;

        if (error) throw error;
        // @ts-ignore
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        throw error;
    }
}

// ================================================
// CONTADOR DE NÃO LIDAS
// ================================================

export async function getUnreadCount(): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Erro ao contar notificações:', error);
        return 0;
    }
}

// ================================================
// MARCAR COMO LIDA
// ================================================

export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('mark_notification_read', {
            p_notification_id: notificationId,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        throw error;
    }
}

export async function markAllAsRead(): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('mark_all_notifications_read');

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Erro ao marcar todas como lidas:', error);
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
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
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
