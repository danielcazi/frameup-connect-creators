import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    Check,
    CheckCheck,
    Archive,
    ArchiveRestore,
    Trash2,
    Loader2,
    Settings,
    Inbox
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import {
    Notification,
    getNotificationIcon,
    getNotificationColor,
    formatNotificationTime,
} from '@/services/notificationService';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TabValue = 'all' | 'unread' | 'archived';

export default function Notifications() {
    const { userType } = useAuth();
    const navigate = useNavigate();
    const {
        notifications,
        archivedNotifications,
        unreadCount,
        archivedCount,
        loading,
        markAsRead,
        markAllAsRead,
        markAllReadAndArchive,
        archiveNotification,
        archiveAllRead,
        unarchiveNotification,
        deleteNotification,
        loadMore,
        loadMoreArchived,
        hasMore,
        hasMoreArchived,
    } = useNotifications();

    const [activeTab, setActiveTab] = useState<TabValue>('all');

    // Filtra notificações baseado na aba ativa
    const getFilteredNotifications = () => {
        switch (activeTab) {
            case 'unread':
                return notifications.filter((n) => !n.is_read);
            case 'archived':
                return archivedNotifications;
            default:
                return notifications;
        }
    };

    const filteredNotifications = getFilteredNotifications();

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read && !notification.is_archived) {
            await markAsRead(notification.id);
        }
        if (notification.action_url) {
            navigate(notification.action_url);
        }
    };

    const handleLoadMore = () => {
        if (activeTab === 'archived') {
            loadMoreArchived();
        } else {
            loadMore();
        }
    };

    const currentHasMore = activeTab === 'archived' ? hasMoreArchived : hasMore;

    // Determina o caminho de preferências baseado no userType
    const preferencesPath = userType === 'creator'
        ? '/creator/notifications/preferences'
        : '/editor/notifications/preferences';

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Notificações"
            subtitle={`${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}`}
            headerAction={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(preferencesPath)}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Preferências
                </Button>
            }
        >
            <div className="max-w-3xl mx-auto">
                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mb-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="all" className="flex items-center gap-2">
                                <Inbox className="w-4 h-4" />
                                Todas
                                {notifications.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                                        {notifications.length}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="unread" className="flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Não lidas
                                {unreadCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="archived" className="flex items-center gap-2">
                                <Archive className="w-4 h-4" />
                                Arquivadas
                                {archivedCount > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                                        {archivedCount}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* Ações em massa */}
                        {activeTab !== 'archived' && notifications.length > 0 && (
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={markAllAsRead}
                                        className="text-primary"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Marcar todas como lidas
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={markAllReadAndArchive}
                                    className="text-muted-foreground"
                                >
                                    <CheckCheck className="w-4 h-4 mr-1" />
                                    Arquivar todas
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Conteúdo das Tabs */}
                    <TabsContent value="all" className="mt-4">
                        <NotificationsList
                            notifications={filteredNotifications}
                            loading={loading}
                            emptyMessage="Nenhuma notificação"
                            emptyDescription="Novas notificações aparecerão aqui"
                            onNotificationClick={handleNotificationClick}
                            onArchive={archiveNotification}
                            onDelete={deleteNotification}
                            onLoadMore={handleLoadMore}
                            hasMore={currentHasMore}
                            showArchiveButton={true}
                        />
                    </TabsContent>

                    <TabsContent value="unread" className="mt-4">
                        <NotificationsList
                            notifications={filteredNotifications}
                            loading={loading}
                            emptyMessage="Nenhuma notificação não lida"
                            emptyDescription="Você está em dia! 🎉"
                            onNotificationClick={handleNotificationClick}
                            onArchive={archiveNotification}
                            onDelete={deleteNotification}
                            onLoadMore={handleLoadMore}
                            hasMore={currentHasMore}
                            showArchiveButton={true}
                        />
                    </TabsContent>

                    <TabsContent value="archived" className="mt-4">
                        <NotificationsList
                            notifications={filteredNotifications}
                            loading={loading}
                            emptyMessage="Nenhuma notificação arquivada"
                            emptyDescription="Notificações arquivadas aparecerão aqui"
                            onNotificationClick={handleNotificationClick}
                            onUnarchive={unarchiveNotification}
                            onDelete={deleteNotification}
                            onLoadMore={handleLoadMore}
                            hasMore={currentHasMore}
                            showUnarchiveButton={true}
                            isArchived={true}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}

// Componente de lista de notificações
interface NotificationsListProps {
    notifications: Notification[];
    loading: boolean;
    emptyMessage: string;
    emptyDescription: string;
    onNotificationClick: (notification: Notification) => void;
    onArchive?: (id: string) => void;
    onUnarchive?: (id: string) => void;
    onDelete: (id: string) => void;
    onLoadMore: () => void;
    hasMore: boolean;
    showArchiveButton?: boolean;
    showUnarchiveButton?: boolean;
    isArchived?: boolean;
}

function NotificationsList({
    notifications,
    loading,
    emptyMessage,
    emptyDescription,
    onNotificationClick,
    onArchive,
    onUnarchive,
    onDelete,
    onLoadMore,
    hasMore,
    showArchiveButton = false,
    showUnarchiveButton = false,
    isArchived = false,
}: NotificationsListProps) {
    if (loading && notifications.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    {isArchived ? (
                        <Archive className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    ) : (
                        <Bell className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    )}
                    <p className="text-lg font-medium text-foreground">
                        {emptyMessage}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {emptyDescription}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => onNotificationClick(notification)}
                    onArchive={showArchiveButton && onArchive ? () => onArchive(notification.id) : undefined}
                    onUnarchive={showUnarchiveButton && onUnarchive ? () => onUnarchive(notification.id) : undefined}
                    onDelete={() => onDelete(notification.id)}
                    isArchived={isArchived}
                />
            ))}

            {hasMore && (
                <button
                    onClick={onLoadMore}
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
        </div>
    );
}

// Componente de item de notificação
interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onArchive?: () => void;
    onUnarchive?: () => void;
    onDelete: () => void;
    isArchived?: boolean;
}

function NotificationItem({
    notification,
    onClick,
    onArchive,
    onUnarchive,
    onDelete,
    isArchived = false
}: NotificationItemProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'flex items-start gap-4 p-4 cursor-pointer transition-colors border-b border-border last:border-0',
                'hover:bg-accent/50',
                !notification.is_read && !isArchived && 'bg-primary/5'
            )}
        >
            {/* Ícone */}
            <div className={cn(
                'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl',
                getNotificationColor(notification.type),
                isArchived && 'opacity-60'
            )}>
                {getNotificationIcon(notification.type)}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-sm',
                        !notification.is_read && !isArchived ? 'font-semibold' : '',
                        isArchived && 'text-muted-foreground'
                    )}>
                        {notification.title}
                    </p>
                    {!notification.is_read && !isArchived && (
                        <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                </div>
                <p className={cn(
                    'text-sm mt-1',
                    isArchived ? 'text-muted-foreground/70' : 'text-muted-foreground'
                )}>
                    {notification.message}
                </p>
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground/70">
                        {formatNotificationTime(notification.created_at)}
                    </p>
                    {isArchived && notification.archived_at && (
                        <span className="text-xs text-muted-foreground/50">
                            • Arquivada {formatNotificationTime(notification.archived_at)}
                        </span>
                    )}
                </div>
            </div>

            {/* Ações */}
            <div className="flex-shrink-0 flex items-center gap-1">
                {onUnarchive && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUnarchive();
                        }}
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Restaurar"
                    >
                        <ArchiveRestore className="w-4 h-4 text-primary" />
                    </button>
                )}
                {onArchive && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onArchive();
                        }}
                        className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                        title="Arquivar"
                    >
                        <Archive className="w-4 h-4 text-primary" />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Excluir"
                >
                    <Trash2 className="w-4 h-4 text-destructive" />
                </button>
            </div>
        </div>
    );
}
