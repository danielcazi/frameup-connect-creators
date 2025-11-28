import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessages, UnreadConversation } from '@/hooks/useUnreadMessages';
import { cn } from '@/lib/utils';

// ================================================
// HELPERS
// ================================================

function formatTimeAgo(dateString: string): string {
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

function truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength).trim() + '...';
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// ================================================
// COMPONENTE PRINCIPAL
// ================================================

export default function MessageBadge() {
    const navigate = useNavigate();
    const { user, userType } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const {
        unreadCount,
        unreadConversations,
        loading,
        markProjectAsRead,
    } = useUnreadMessages();

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

    // Handler para clicar na conversa
    const handleConversationClick = async (conversation: UnreadConversation) => {
        // Navegar para o chat
        const basePath = userType === 'creator' ? '/creator' : '/editor';
        navigate(`${basePath}/project/${conversation.project_id}/chat`);
        setIsOpen(false);

        // Marcar como lida (opcional - o Chat.tsx já faz isso)
        // await markProjectAsRead(conversation.project_id);
    };

    // Handler para ver todas
    const handleViewAll = () => {
        const basePath = userType === 'creator' ? '/creator' : '/editor';
        navigate(`${basePath}/messages`);
        setIsOpen(false);
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Botão do ícone de mensagem */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'relative p-2 rounded-lg transition-colors',
                    'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
                    isOpen && 'bg-accent'
                )}
                aria-label="Mensagens"
                title={unreadCount > 0 ? `${unreadCount} mensagens não lidas` : 'Mensagens'}
            >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />

                {/* Badge de contagem */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-blue-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">Mensagens</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                    {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-accent rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Lista de conversas */}
                    <div className="max-h-[350px] overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : unreadConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                <MessageSquare className="w-12 h-12 text-muted-foreground/50 mb-3" />
                                <p className="text-sm text-muted-foreground">Nenhuma mensagem não lida</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Suas conversas aparecerão aqui
                                </p>
                            </div>
                        ) : (
                            unreadConversations.map((conversation) => (
                                <ConversationItem
                                    key={conversation.project_id}
                                    conversation={conversation}
                                    onClick={() => handleConversationClick(conversation)}
                                />
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-4 py-2 bg-muted/30">
                        <button
                            onClick={handleViewAll}
                            className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium py-1"
                        >
                            Ver todas as mensagens
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ================================================
// COMPONENTE DE ITEM
// ================================================

interface ConversationItemProps {
    conversation: UnreadConversation;
    onClick: () => void;
}

function ConversationItem({ conversation, onClick }: ConversationItemProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                'hover:bg-accent/50 border-b border-border last:border-0',
                'bg-blue-50/50' // Sempre destacado pois são não lidas
            )}
        >
            {/* Avatar */}
            <div className="flex-shrink-0">
                {conversation.other_user_avatar ? (
                    <img
                        src={conversation.other_user_avatar}
                        alt={conversation.other_user_name}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(conversation.other_user_name)}
                    </div>
                )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                            {conversation.other_user_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {conversation.project_title}
                        </p>
                    </div>

                    {/* Badge de contagem e hora */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(conversation.last_message_at)}
                        </span>
                        {conversation.unread_count > 1 && (
                            <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold text-white bg-blue-600 rounded-full">
                                {conversation.unread_count}
                            </span>
                        )}
                    </div>
                </div>

                {/* Preview da mensagem */}
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {truncateMessage(conversation.last_message, 80)}
                </p>
            </div>

            {/* Indicador de não lida */}
            <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
        </div>
    );
}
