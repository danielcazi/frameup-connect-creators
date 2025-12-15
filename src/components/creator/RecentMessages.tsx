// src/components/creator/RecentMessages.tsx
// Versão ajustada para ficar igual ao Dashboard do Editor

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { formatTimestamp } from '@/utils/dateHelpers';
import { cn } from '@/lib/utils';

interface RecentMessage {
    id: string;
    project_id: string;
    project_title: string;
    sender_id: string;
    sender_name: string;
    sender_avatar?: string;
    content: string;
    created_at: string;
    is_read: boolean;
}

interface RecentMessagesProps {
    userId: string;
    maxMessages?: number;
    className?: string;
}

export function RecentMessages({
    userId,
    maxMessages = 3,
    className
}: RecentMessagesProps) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<RecentMessage[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        fetchRecentMessages();

        // Subscription para novas mensagens
        const subscription = supabase
            .channel(`creator-messages-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${userId}`
            }, () => fetchRecentMessages())
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, [userId]);

    const fetchRecentMessages = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('messages')
                .select(`
          id, project_id, content, created_at, is_read,
          projects!inner (id, title),
          users!sender_id (id, full_name, profile_photo_url)
        `)
                // Nota: O alias da tabela users aqui é implicito ou baseado na relation, 
                // assumindo que a foreign key aponta para users.id
                .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
                .order('created_at', { ascending: false })
                .limit(maxMessages * 2);

            if (error) throw error;

            // Agrupar por projeto (última mensagem de cada)
            const projectMap = new Map<string, RecentMessage>();
            (data || []).forEach(msg => {
                if (!projectMap.has(msg.project_id)) {
                    projectMap.set(msg.project_id, {
                        id: msg.id,
                        project_id: msg.project_id,
                        project_title: (msg.projects as any)?.title || 'Projeto',
                        sender_id: (msg.users as any)?.id || '',
                        sender_name: (msg.users as any)?.full_name || 'Usuário',
                        sender_avatar: (msg.users as any)?.profile_photo_url,
                        content: msg.content,
                        created_at: msg.created_at,
                        is_read: msg.is_read
                    });
                }
            });

            setMessages(Array.from(projectMap.values()).slice(0, maxMessages));
        } catch (error) {
            console.error('[RecentMessages] Erro:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
            {/* Header - Estilo Editor */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground">Mensagens Recentes</h3>
                </div>

                <button
                    onClick={() => navigate('/creator/messages')}
                    className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                >
                    Ver todas
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Lista de Mensagens */}
            <div className="divide-y divide-border">
                {loading ? (
                    // Skeleton
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse flex gap-3">
                                <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-muted rounded w-2/3" />
                                    <div className="h-3 bg-muted rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : messages.length > 0 ? (
                    messages.map(message => (
                        <div
                            key={message.id}
                            onClick={() => navigate(`/creator/project/${message.project_id}?tab=chat`)}
                            className={cn(
                                "flex items-start gap-3 p-4 cursor-pointer transition-colors",
                                "hover:bg-muted/50",
                                !message.is_read && "bg-blue-50/30 dark:bg-blue-900/10"
                            )}
                        >
                            {/* Avatar */}
                            <Avatar className="w-10 h-10 border border-border flex-shrink-0">
                                <AvatarImage src={message.sender_avatar} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                    {message.sender_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-medium text-sm text-foreground truncate">
                                        {message.sender_name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatTimestamp(message.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                    {message.content}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    /* Empty State - Estilo Editor */
                    <div className="text-center py-8 px-4">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                            Nenhuma mensagem recente
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Conversas com editores aparecerão aqui
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RecentMessages;
