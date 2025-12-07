import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReviewComment } from './ReviewComment';
import type { DeliveryComment } from '@/types/delivery';

interface CommentListProps {
    comments: DeliveryComment[];
    videoType: 'youtube' | 'gdrive';
    isReadOnly?: boolean;
    currentUserId?: string;
    onSeekTo: (time: number) => void;
    onToggleResolved: (id: string) => void;
    onDelete: (id: string) => void;
    onAddReply: (commentId: string, content: string) => Promise<void>;
    onDeleteReply: (replyId: string) => void;
}

export function CommentList({
    comments,
    videoType,
    isReadOnly = false,
    currentUserId,
    onSeekTo,
    onToggleResolved,
    onDelete,
    onAddReply,
    onDeleteReply,
}: CommentListProps) {
    // Ordenar por timestamp
    const sortedComments = [...comments].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

    const stats = {
        total: comments.length,
        pending: comments.filter((c) => !c.is_resolved).length,
        resolved: comments.filter((c) => c.is_resolved).length,
    };

    return (
        <div className="h-full flex flex-col bg-card border-l">
            {/* Stats Header */}
            <div className="flex gap-3 p-4 border-b bg-muted/30">
                <div className="flex-1 bg-card rounded-lg p-3 text-center border">
                    <div className="text-2xl font-bold text-primary">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="flex-1 bg-card rounded-lg p-3 text-center border">
                    <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
                    <div className="text-xs text-muted-foreground">Pendentes</div>
                </div>
                <div className="flex-1 bg-card rounded-lg p-3 text-center border">
                    <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                    <div className="text-xs text-muted-foreground">Resolvidos</div>
                </div>
            </div>

            {/* Title */}
            <div className="py-4 px-6 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Comentários
                </h2>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {sortedComments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum comentário ainda.</p>
                            <p className="text-sm mt-2">
                                {isReadOnly
                                    ? 'Os comentários aparecerão aqui.'
                                    : 'Adicione comentários para começar!'
                                }
                            </p>
                        </div>
                    ) : (
                        sortedComments.map((comment) => (
                            <ReviewComment
                                key={comment.id}
                                comment={comment}
                                canSeek={videoType === 'youtube'}
                                isReadOnly={isReadOnly}
                                currentUserId={currentUserId}
                                onSeek={onSeekTo}
                                onToggleResolved={onToggleResolved}
                                onDelete={onDelete}
                                onAddReply={onAddReply}
                                onDeleteReply={onDeleteReply}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
