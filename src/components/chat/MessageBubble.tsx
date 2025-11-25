import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Check, CheckCheck } from 'lucide-react';

interface Message {
    id: string;
    message_text: string;
    is_read: boolean;
    created_at: string;
    attachment_url?: string;
}

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    senderName: string;
    senderAvatar?: string;
}

function MessageBubble({
    message,
    isOwn,
    senderName,
    senderAvatar,
}: MessageBubbleProps) {
    function formatTime(date: string) {
        return new Date(date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {!isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={senderAvatar} alt={senderName} />
                    <AvatarFallback className="text-xs">
                        {getInitials(senderName)}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* Message Content */}
            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                {/* Sender Name (only for received messages) */}
                {!isOwn && (
                    <p className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</p>
                )}

                {/* Bubble */}
                <div
                    className={`rounded-2xl px-4 py-2 ${isOwn
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                        }`}
                >
                    {/* Text */}
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.message_text}
                    </p>

                    {/* Attachment (if exists) */}
                    {message.attachment_url && (
                        <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`block mt-2 text-xs underline ${isOwn ? 'text-primary-foreground/80 hover:text-primary-foreground' : 'text-primary hover:text-primary/80'
                                }`}
                        >
                            📎 Arquivo anexado
                        </a>
                    )}
                </div>

                {/* Time & Read Status */}
                <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>

                    {/* Read Status (only for own messages) */}
                    {isOwn && (
                        <span className="text-muted-foreground">
                            {message.is_read ? (
                                <CheckCheck className="w-3 h-3 text-primary" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessageBubble;
