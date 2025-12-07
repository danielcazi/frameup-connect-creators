import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    Check,
    Clock,
    Trash2,
    ChevronDown,
    ChevronUp,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReviewReplyForm } from './ReviewReplyForm';
import { ReviewCommentReply } from './ReviewCommentReply';
import type { DeliveryComment, DeliveryCommentReply, CommentTag, TAG_LABELS } from '@/types/delivery';
import { formatTimestamp } from '@/types/delivery';
import { cn } from '@/lib/utils';

interface ReviewCommentProps {
    comment: DeliveryComment;
    canSeek?: boolean;
    isReadOnly?: boolean;
    currentUserId?: string;
    onSeek: (time: number) => void;
    onToggleResolved: (id: string) => void;
    onDelete: (id: string) => void;
    onAddReply: (commentId: string, content: string) => Promise<void>;
    onDeleteReply: (replyId: string) => void;
}

const TAG_CONFIG: Record<CommentTag, { label: string; emoji: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    correction: { label: 'Correção', emoji: '🔧', variant: 'destructive' },
    suggestion: { label: 'Sugestão', emoji: '💡', variant: 'secondary' },
    approved: { label: 'Aprovado', emoji: '✅', variant: 'default' },
    question: { label: 'Dúvida', emoji: '❓', variant: 'outline' },
    praise: { label: 'Elogio', emoji: '👏', variant: 'default' },
};

export function ReviewComment({
    comment,
    canSeek = true,
    isReadOnly = false,
    currentUserId,
    onSeek,
    onToggleResolved,
    onDelete,
    onAddReply,
    onDeleteReply,
}: ReviewCommentProps) {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Optimistic Update State
    const [localResolved, setLocalResolved] = useState(comment.is_resolved);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync with server state
    useEffect(() => {
        setLocalResolved(comment.is_resolved);
    }, [comment.is_resolved]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleToggleResolved = async () => {
        if (isUpdating || isReadOnly) return;

        // Optimistic update
        const newValue = !localResolved;
        setLocalResolved(newValue);
        setIsUpdating(true);

        try {
            await onToggleResolved(comment.id);
        } catch (error) {
            // Revert on error
            setLocalResolved(!newValue);
            console.error('Error toggling resolved state:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSubmitReply = async (content: string) => {
        setIsSubmitting(true);
        try {
            await onAddReply(comment.id, content);
            setShowReplyForm(false);
            setShowReplies(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isOwnComment = currentUserId === comment.author_id;
    const replies = comment.replies || [];

    return (
        <div
            className={cn(
                "bg-card border rounded-lg p-4 transition-all hover:border-primary/50",
                localResolved && "opacity-60 bg-muted/30"
            )}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {/* Timestamp Button */}
                    <button
                        type="button"
                        onClick={() => canSeek && onSeek(comment.timestamp_seconds)}
                        disabled={!canSeek}
                        className={cn(
                            "px-3 py-1 bg-primary text-primary-foreground rounded-md font-mono text-sm font-semibold transition-colors",
                            canSeek
                                ? "hover:bg-primary/90 cursor-pointer"
                                : "opacity-50 cursor-not-allowed"
                        )}
                        title={canSeek ? 'Pular para este momento' : 'Sincronização não disponível para Google Drive'}
                    >
                        {formatTimestamp(comment.timestamp_seconds)}
                    </button>

                    {/* Tag */}
                    {comment.tag && TAG_CONFIG[comment.tag] && (
                        <Badge variant={TAG_CONFIG[comment.tag].variant}>
                            {TAG_CONFIG[comment.tag].emoji} {TAG_CONFIG[comment.tag].label}
                        </Badge>
                    )}
                </div>

                {/* Actions */}
                {!isReadOnly ? (
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id={`resolve-${comment.id}`}
                            checked={localResolved}
                            onCheckedChange={handleToggleResolved}
                            disabled={isUpdating}
                            className={cn(
                                "h-5 w-5 rounded border-2 transition-all duration-200",
                                localResolved
                                    ? "border-green-500 bg-green-500 text-white data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                    : "border-muted-foreground hover:border-green-400"
                            )}
                        />
                        <label
                            htmlFor={`resolve-${comment.id}`}
                            className={cn(
                                "text-xs cursor-pointer font-medium transition-colors",
                                localResolved ? "text-green-600" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {localResolved ? 'Resolvido' : 'Resolver'}
                        </label>

                        {/* Actions Dropdown */}
                        {isOwnComment && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => onDelete(comment.id)}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                ) : (
                    localResolved && (
                        <div className="flex items-center gap-2">
                            <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full">
                                <Check className="h-3 w-3 text-green-600 dark:text-green-500" />
                            </div>
                            <span className="text-sm font-medium text-green-600 dark:text-green-500">Resolvido</span>
                        </div>
                    )
                )}
            </div>

            {/* Author & Content */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={comment.author?.profile_photo_url || ''} />
                        <AvatarFallback className="text-xs">
                            {comment.author?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm text-foreground">
                        {comment.author?.full_name || 'Usuário'}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-muted-foreground text-xs">{formatDate(comment.created_at)}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                        {comment.author_type === 'creator' ? 'Creator' :
                            comment.author_type === 'editor' ? 'Editor' : 'Admin'}
                    </Badge>
                </div>
                <p className="text-foreground leading-relaxed pl-8">{comment.content}</p>
            </div>

            {/* Reply Actions */}
            {
                !isReadOnly && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-3 pl-8">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReplyForm(!showReplyForm)}
                            className="text-sm"
                        >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder
                        </Button>

                        {replies.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowReplies(!showReplies)}
                                className="text-sm"
                            >
                                {replies.length} {replies.length === 1 ? 'resposta' : 'respostas'}
                                {showReplies ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                            </Button>
                        )}
                    </div>
                )
            }

            {/* Reply Form */}
            {
                showReplyForm && !isReadOnly && (
                    <div className="mt-3 pl-8">
                        <ReviewReplyForm
                            onSubmit={handleSubmitReply}
                            onCancel={() => setShowReplyForm(false)}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                )
            }

            {/* Replies List */}
            {
                showReplies && replies.length > 0 && (
                    <div className="mt-3 pl-8 space-y-2">
                        {replies.map((reply) => (
                            <ReviewCommentReply
                                key={reply.id}
                                reply={reply}
                                isOwnReply={currentUserId === reply.author_id}
                                isReadOnly={isReadOnly}
                                onDelete={onDeleteReply}
                            />
                        ))}
                    </div>
                )
            }
        </div>
    );
}
