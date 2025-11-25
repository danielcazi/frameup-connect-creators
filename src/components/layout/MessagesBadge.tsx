import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { MessageSquare } from 'lucide-react';

function MessagesBadge() {
    const navigate = useNavigate();
    const { userType } = useAuth();
    const { unreadCount } = useUnreadMessages();

    const handleClick = () => {
        // Navegar para lista de mensagens
        navigate(userType === 'creator' ? '/creator/messages' : '/editor/messages');
    };

    return (
        <button
            onClick={handleClick}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            title={`${unreadCount} mensagem${unreadCount !== 1 ? 'ns' : ''} não lida${unreadCount !== 1 ? 's' : ''}`}
        >
            <MessageSquare className="w-6 h-6 text-muted-foreground" />

            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );
}

export default MessagesBadge;
