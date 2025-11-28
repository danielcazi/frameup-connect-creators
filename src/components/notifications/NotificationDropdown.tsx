import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, Loader2, X } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
    Notification,
    getNotificationIcon,
    getNotificationColor,
    formatNotificationTime,
} from '@/services/notificationService';
import { cn } from '@/lib/utils';

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handler para clicar na notificação
    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (notification.action_url) {
            navigate(notification.action_url);
            setIsOpen(false);
        }
    };

    // Handler para deletar
    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    // Handler para marcar todas como lidas
    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botão do sino */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'relative p-2 rounded-lg transition-colors',
                    'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
                    isOpen && 'bg-accent'
                )}
                aria-label="Notificações"
            >
                <Bell className="w-5 h-5 text-muted-foreground" />

                {/* Badge de contagem */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-destructive rounded-full animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                        <h3 className="font-semibold text-foreground">Notificações</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                                    title="Marcar todas como lidas"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    <span className="hidden sm:inline">Marcar todas</span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-accent rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Lista de notificações */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <Bell className="w-12 h-12 text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Você será notificado sobre atualizações importantes
                                </p>
                            </div>
                        ) : (
                            <>
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onClick={() => handleNotificationClick(notification)}
                                        onDelete={(e) => handleDelete(e, notification.id)}
                                    />
                                ))}

                                {/* Load more */}
                                {hasMore && (
                                    <button
                                        onClick={loadMore}
                                        disabled={loading}
                                        className="w-full py-3 text-sm text-primary hover:bg-accent transition-colors flex items-center justify-center gap-2"
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

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t border-border px-4 py-2 bg-muted/30">
                            <button
                                onClick={() => {
                                    const path = window.location.pathname.startsWith('/creator')
                                        ? '/creator/notifications'
                                        : '/editor/notifications';
                                    navigate(path);
                                    setIsOpen(false);
                                }}
                                className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium"
                            >
                                Ver todas as notificações
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Componente de item individual
interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}

function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
    const [showDelete, setShowDelete] = useState(false);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                'hover:bg-accent/50 border-b border-border last:border-0',
                !notification.is_read && 'bg-primary/5'
            )}
        >
            {/* Ícone */}
            <div className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg',
                getNotificationColor(notification.type)
            )}>
                {getNotificationIcon(notification.type)}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm line-clamp-1',
                        !notification.is_read ? 'font-semibold text-foreground' : 'text-foreground'
                    )}>
                        {notification.title}
                    </p>

                    {/* Indicador de não lida */}
                    {!notification.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                    )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                </p>

                <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatNotificationTime(notification.created_at)}
                </p>
            </div>

            {/* Botão deletar */}
            {showDelete && (
                <button
                    onClick={onDelete}
                    className="flex-shrink-0 p-1 hover:bg-destructive/10 rounded transition-colors"
                    title="Remover notificação"
                >
                    <Trash2 className="w-4 h-4 text-destructive" />
                </button>
            )}
        </div>
    );
}
