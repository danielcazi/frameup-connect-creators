import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Loader2, Settings } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import {
    getNotificationIcon,
    getNotificationColor,
    formatNotificationTime,
} from '@/services/notificationService';
import { cn } from '@/lib/utils';

export default function Notifications() {
    const { userType } = useAuth();
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        loadMore,
        hasMore,
    } = useNotifications();

    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const filteredNotifications = filter === 'unread'
        ? notifications.filter((n) => !n.is_read)
        : notifications;

    const handleNotificationClick = async (notification: any) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        if (notification.action_url) {
            navigate(notification.action_url);
        }
    };

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Notificações"
            subtitle={`${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
            headerAction={
                <button
                    onClick={() => navigate('/settings/notifications')}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                    <Settings className="w-4 h-4" />
                    Preferências
                </button>
            }
        >
            <div className="max-w-3xl mx-auto">
                {/* Filters */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={cn(
                                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                                filter === 'all'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                            )}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={cn(
                                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                                filter === 'unread'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                            )}
                        >
                            Não lidas ({unreadCount})
                        </button>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80"
                        >
                            <Check className="w-4 h-4" />
                            Marcar todas como lidas
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <p className="text-lg font-medium text-foreground">
                                {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Novas notificações aparecerão aqui
                            </p>
                        </div>
                    ) : (
                        <>
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        'flex items-start gap-4 p-4 cursor-pointer transition-colors border-b border-border last:border-0',
                                        'hover:bg-accent/50',
                                        !notification.is_read && 'bg-primary/5'
                                    )}
                                >
                                    <div className={cn(
                                        'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl',
                                        getNotificationColor(notification.type)
                                    )}>
                                        {getNotificationIcon(notification.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={cn(
                                                'text-sm',
                                                !notification.is_read ? 'font-semibold' : ''
                                            )}>
                                                {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                                <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground/70 mt-2">
                                            {formatNotificationTime(notification.created_at)}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification.id);
                                        }}
                                        className="flex-shrink-0 p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </button>
                                </div>
                            ))}

                            {hasMore && (
                                <button
                                    onClick={loadMore}
                                    disabled={loading}
                                    className="w-full py-4 text-sm text-primary hover:bg-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Carregar mais'
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
