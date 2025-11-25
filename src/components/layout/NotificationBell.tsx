import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Bell, X, CheckCircle, XCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    reference_id?: string;
    is_read: boolean;
    created_at: string;
}

function NotificationBell() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadNotifications();
            const unsubscribe = subscribeToNotifications();
            return unsubscribe;
        }
    }, [user]);

    async function loadNotifications() {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            setNotifications(data || []);
            setUnreadCount(data?.filter(n => !n.is_read).length || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToNotifications() {
        if (!user) return () => { };

        const subscription = supabase
            .channel('notifications')
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
                    setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }

    async function markAsRead(notificationId: string) {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async function markAllAsRead() {
        if (!user) return;
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    function handleNotificationClick(notification: Notification) {
        markAsRead(notification.id);
        setShowDropdown(false);

        // Navegar baseado no tipo
        if (notification.type === 'application_accepted' && notification.reference_id) {
            navigate(`/editor/project/${notification.reference_id}/chat`);
        } else if (notification.type === 'application_rejected') {
            navigate('/editor/dashboard');
        }
    }

    function getNotificationIcon(type: string) {
        switch (type) {
            case 'application_accepted':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'application_rejected':
                return <XCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Info className="w-5 h-5 text-primary" />;
        }
    }

    function getTimeAgo(date: string) {
        const now = new Date();
        const created = new Date(date);
        const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Agora';
        if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h atrás`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Ontem';
        if (diffInDays < 7) return `${diffInDays}d atrás`;

        return created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }

    if (!user) return null;

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
                <Bell className="w-6 h-6 text-muted-foreground" />

                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown Panel */}
                    <div className="absolute right-0 mt-2 w-96 bg-card rounded-lg shadow-lg border border-border z-50">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground">Notificações</h3>

                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-sm text-primary hover:text-primary/80 font-medium"
                                    >
                                        Marcar todas como lidas
                                    </button>
                                )}

                                <button
                                    onClick={() => setShowDropdown(false)}
                                    className="p-1 hover:bg-accent rounded transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full text-left p-4 border-b border-border hover:bg-accent transition-colors ${!notification.is_read ? 'bg-primary/5' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Icon */}
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground mb-1">
                                                    {notification.title}
                                                </p>
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getTimeAgo(notification.created_at)}
                                                </p>
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notification.is_read && (
                                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground">Nenhuma notificação</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t border-border">
                                <button
                                    onClick={() => {
                                        setShowDropdown(false);
                                        navigate('/notifications');
                                    }}
                                    className="w-full text-sm text-primary hover:text-primary/80 font-medium"
                                >
                                    Ver todas as notificações
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationBell;
