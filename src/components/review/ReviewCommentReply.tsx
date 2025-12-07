import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DeliveryCommentReply } from '@/types/delivery';

interface ReviewCommentReplyProps {
    reply: DeliveryCommentReply;
    isOwnReply: boolean;
    isReadOnly?: boolean;
    onDelete: (replyId: string) => void;
}

export function ReviewCommentReply({
    reply,
    isOwnReply,
    isReadOnly = false,
    onDelete,
}: ReviewCommentReplyProps) {
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary/30">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={reply.author?.profile_photo_url || ''} />
                        <AvatarFallback className="text-xs">
                            {reply.author?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                        {reply.author?.full_name || 'Usuário'}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">{formatDate(reply.created_at)}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                        {reply.author_type === 'creator' ? 'Creator' :
                            reply.author_type === 'editor' ? 'Editor' : 'Admin'}
                    </Badge>
                </div>

                {isOwnReply && !isReadOnly && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(reply.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                )}
            </div>
            <p className="text-sm text-foreground pl-7">{reply.content}</p>
        </div>
    );
}
