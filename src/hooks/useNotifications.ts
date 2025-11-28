import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Notification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from '@/services/notificationService';

interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    hasMore: boolean;
}

const PAGE_SIZE = 20;

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Carregar notificações iniciais
    const loadNotifications = useCallback(async (reset: boolean = false) => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const newOffset = reset ? 0 : offset;
            const data = await getNotifications(PAGE_SIZE, newOffset);

            if (reset) {
                setNotifications(data);
            } else {
                setNotifications((prev) => [...prev, ...data]);
            }

            setHasMore(data.length === PAGE_SIZE);
            if (reset) setOffset(PAGE_SIZE);
            else setOffset((prev) => prev + PAGE_SIZE);
        } catch (err) {
            setError('Erro ao carregar notificações');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, offset]);

    // Carregar contador de não lidas
    const loadUnreadCount = useCallback(async () => {
        if (!user) return;

        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error('Erro ao carregar contador:', err);
        }
    }, [user]);

    // Marcar como lida
    const handleMarkAsRead = useCallback(async (id: string) => {
        try {
            await markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Erro ao marcar como lida:', err);
            throw err;
        }
    }, []);

    // Marcar todas como lidas
    const handleMarkAllAsRead = useCallback(async () => {
        try {
            await markAllAsRead();
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);
        } catch (err) {
            console.error('Erro ao marcar todas como lidas:', err);
            throw err;
        }
    }, []);

    // Deletar notificação
    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteNotification(id);
            const notification = notifications.find((n) => n.id === id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (notification && !notification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Erro ao deletar:', err);
            throw err;
        }
    }, [notifications]);

    // Refresh
    const refresh = useCallback(async () => {
        setOffset(0);
        await loadNotifications(true);
        await loadUnreadCount();
    }, [loadNotifications, loadUnreadCount]);

    // Load more
    const loadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        await loadNotifications(false);
    }, [hasMore, loading, loadNotifications]);

    // Efeito inicial
    useEffect(() => {
        if (user) {
            loadNotifications(true);
            loadUnreadCount();
        }
    }, [user]);

    // Real-time subscription
    useEffect(() => {
        if (!user) return;

        const subscription = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications((prev) => [newNotification, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const updated = payload.new as Notification;
                    setNotifications((prev) =>
                        prev.map((n) => (n.id === updated.id ? updated : n))
                    );
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const deleted = payload.old as { id: string };
                    setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDelete,
        refresh,
        loadMore,
        hasMore,
    };
}
