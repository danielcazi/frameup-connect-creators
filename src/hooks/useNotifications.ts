import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Notification,
    NotificationFilter,
    getNotifications,
    getActiveNotifications,
    getArchivedNotifications,
    getUnreadCount,
    getArchivedCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    archiveAllRead,
    markAllReadAndArchive,
    unarchiveNotification,
    deleteNotification,
} from '@/services/notificationService';

interface UseNotificationsReturn {
    notifications: Notification[];
    archivedNotifications: Notification[];
    unreadCount: number;
    archivedCount: number;
    loading: boolean;
    error: string | null;
    filter: NotificationFilter;
    setFilter: (filter: NotificationFilter) => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    archiveNotification: (id: string) => Promise<void>;
    archiveAllRead: () => Promise<void>;
    markAllReadAndArchive: () => Promise<void>;
    unarchiveNotification: (id: string) => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    loadMoreArchived: () => Promise<void>;
    hasMore: boolean;
    hasMoreArchived: boolean;
}

const PAGE_SIZE = 20;

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [archivedNotifications, setArchivedNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [archivedCount, setArchivedCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [offset, setOffset] = useState(0);
    const [archivedOffset, setArchivedOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [hasMoreArchived, setHasMoreArchived] = useState(true);

    // Carregar notificações ativas (não arquivadas)
    const loadNotifications = useCallback(async (reset: boolean = false) => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const newOffset = reset ? 0 : offset;
            const data = await getActiveNotifications(PAGE_SIZE, newOffset);

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

    // Carregar notificações arquivadas
    const loadArchivedNotifications = useCallback(async (reset: boolean = false) => {
        if (!user) return;

        try {
            const newOffset = reset ? 0 : archivedOffset;
            const data = await getArchivedNotifications(PAGE_SIZE, newOffset);

            if (reset) {
                setArchivedNotifications(data);
            } else {
                setArchivedNotifications((prev) => [...prev, ...data]);
            }

            setHasMoreArchived(data.length === PAGE_SIZE);
            if (reset) setArchivedOffset(PAGE_SIZE);
            else setArchivedOffset((prev) => prev + PAGE_SIZE);
        } catch (err) {
            console.error('Erro ao carregar arquivadas:', err);
        }
    }, [user, archivedOffset]);

    // Carregar contadores
    const loadCounts = useCallback(async () => {
        if (!user) return;

        try {
            const [unread, archived] = await Promise.all([
                getUnreadCount(),
                getArchivedCount()
            ]);
            setUnreadCount(unread);
            setArchivedCount(archived);
        } catch (err) {
            console.error('Erro ao carregar contadores:', err);
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

    // Arquivar notificação
    const handleArchiveNotification = useCallback(async (id: string) => {
        try {
            await archiveNotification(id);
            const notification = notifications.find((n) => n.id === id);

            // Remove da lista ativa
            setNotifications((prev) => prev.filter((n) => n.id !== id));

            // Adiciona na lista arquivada
            if (notification) {
                const archivedNotification = {
                    ...notification,
                    is_read: true,
                    is_archived: true,
                    archived_at: new Date().toISOString()
                };
                setArchivedNotifications((prev) => [archivedNotification, ...prev]);
                setArchivedCount((prev) => prev + 1);
            }

            // Atualiza contador de não lidas se necessário
            if (notification && !notification.is_read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Erro ao arquivar:', err);
            throw err;
        }
    }, [notifications]);

    // Arquivar todas as lidas
    const handleArchiveAllRead = useCallback(async () => {
        try {
            await archiveAllRead();

            const readNotifications = notifications.filter(n => n.is_read);
            const unreadNotifications = notifications.filter(n => !n.is_read);

            // Move lidas para arquivadas
            setNotifications(unreadNotifications);
            setArchivedNotifications((prev) => [
                ...readNotifications.map(n => ({ ...n, is_archived: true, archived_at: new Date().toISOString() })),
                ...prev
            ]);
            setArchivedCount((prev) => prev + readNotifications.length);
        } catch (err) {
            console.error('Erro ao arquivar lidas:', err);
            throw err;
        }
    }, [notifications]);

    // Marcar todas como lidas E arquivar
    const handleMarkAllReadAndArchive = useCallback(async () => {
        try {
            await markAllReadAndArchive();

            const allNotifications = notifications.map(n => ({
                ...n,
                is_read: true,
                is_archived: true,
                read_at: new Date().toISOString(),
                archived_at: new Date().toISOString()
            }));

            // Move todas para arquivadas
            setArchivedNotifications((prev) => [...allNotifications, ...prev]);
            setArchivedCount((prev) => prev + notifications.length);
            setNotifications([]);
            setUnreadCount(0);
        } catch (err) {
            console.error('Erro ao marcar e arquivar:', err);
            throw err;
        }
    }, [notifications]);

    // Desarquivar notificação
    const handleUnarchiveNotification = useCallback(async (id: string) => {
        try {
            await unarchiveNotification(id);
            const notification = archivedNotifications.find((n) => n.id === id);

            // Remove da lista arquivada
            setArchivedNotifications((prev) => prev.filter((n) => n.id !== id));
            setArchivedCount((prev) => Math.max(0, prev - 1));

            // Adiciona na lista ativa
            if (notification) {
                const activeNotification = {
                    ...notification,
                    is_archived: false,
                    archived_at: undefined
                };
                setNotifications((prev) => [activeNotification, ...prev].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
            }
        } catch (err) {
            console.error('Erro ao desarquivar:', err);
            throw err;
        }
    }, [archivedNotifications]);

    // Deletar notificação
    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteNotification(id);

            // Verifica se está nas ativas ou arquivadas
            const activeNotification = notifications.find((n) => n.id === id);
            const archivedNotification = archivedNotifications.find((n) => n.id === id);

            if (activeNotification) {
                setNotifications((prev) => prev.filter((n) => n.id !== id));
                if (!activeNotification.is_read) {
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                }
            }

            if (archivedNotification) {
                setArchivedNotifications((prev) => prev.filter((n) => n.id !== id));
                setArchivedCount((prev) => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Erro ao deletar:', err);
            throw err;
        }
    }, [notifications, archivedNotifications]);

    // Refresh
    const refresh = useCallback(async () => {
        setOffset(0);
        setArchivedOffset(0);
        await Promise.all([
            loadNotifications(true),
            loadArchivedNotifications(true),
            loadCounts()
        ]);
    }, [loadNotifications, loadArchivedNotifications, loadCounts]);

    // Load more
    const loadMore = useCallback(async () => {
        if (!hasMore || loading) return;
        await loadNotifications(false);
    }, [hasMore, loading, loadNotifications]);

    // Load more archived
    const loadMoreArchived = useCallback(async () => {
        if (!hasMoreArchived || loading) return;
        await loadArchivedNotifications(false);
    }, [hasMoreArchived, loading, loadArchivedNotifications]);

    // Efeito inicial
    useEffect(() => {
        if (user) {
            loadNotifications(true);
            loadArchivedNotifications(true);
            loadCounts();
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
                    // Só adiciona se não estiver arquivada
                    if (!newNotification.is_archived) {
                        setNotifications((prev) => [newNotification, ...prev]);
                        if (!newNotification.is_read) {
                            setUnreadCount((prev) => prev + 1);
                        }
                    }
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

                    if (updated.is_archived) {
                        // Se foi arquivada, remove das ativas e adiciona nas arquivadas
                        setNotifications((prev) => prev.filter((n) => n.id !== updated.id));
                        setArchivedNotifications((prev) => {
                            const exists = prev.some(n => n.id === updated.id);
                            if (exists) {
                                return prev.map((n) => (n.id === updated.id ? updated : n));
                            }
                            return [updated, ...prev];
                        });
                    } else {
                        // Se foi desarquivada ou apenas atualizada
                        setNotifications((prev) =>
                            prev.map((n) => (n.id === updated.id ? updated : n))
                        );
                        setArchivedNotifications((prev) => prev.filter((n) => n.id !== updated.id));
                    }
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
                    setArchivedNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    return {
        notifications,
        archivedNotifications,
        unreadCount,
        archivedCount,
        loading,
        error,
        filter,
        setFilter,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        archiveNotification: handleArchiveNotification,
        archiveAllRead: handleArchiveAllRead,
        markAllReadAndArchive: handleMarkAllReadAndArchive,
        unarchiveNotification: handleUnarchiveNotification,
        deleteNotification: handleDelete,
        refresh,
        loadMore,
        loadMoreArchived,
        hasMore,
        hasMoreArchived,
    };
}
