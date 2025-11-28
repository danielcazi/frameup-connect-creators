import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export interface UnreadMessage {
    id: string;
    project_id: string;
    sender_id: string;
    message_text: string;
    created_at: string;
    // Dados do remetente
    sender: {
        full_name: string;
        profile_photo_url?: string;
    };
    // Dados do projeto
    project: {
        title: string;
    };
}

export interface UnreadConversation {
    project_id: string;
    project_title: string;
    other_user_id: string;
    other_user_name: string;
    other_user_avatar?: string;
    unread_count: number;
    last_message: string;
    last_message_at: string;
}

interface UseUnreadMessagesReturn {
    unreadCount: number;
    unreadConversations: UnreadConversation[];
    lastMessages: UnreadMessage[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    markProjectAsRead: (projectId: string) => Promise<void>;
}

// ================================================
// HOOK
// ================================================

export function useUnreadMessages(): UseUnreadMessagesReturn {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadConversations, setUnreadConversations] = useState<UnreadConversation[]>([]);
    const [lastMessages, setLastMessages] = useState<UnreadMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ================================================
    // CARREGAR DADOS
    // ================================================

    const loadUnreadData = useCallback(async () => {
        if (!user) return;

        try {
            setError(null);

            // 1. Buscar contagem total de não lidas
            let count = 0;
            try {
                const { data: countData, error: countError } = await supabase
                    .rpc('get_unread_messages_count', { p_user_id: user.id });

                if (countError) throw countError;
                count = countData || 0;
            } catch (rpcErr) {
                // Fallback: contar diretamente
                const { count: directCount } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('is_read', false);

                count = directCount || 0;
            }
            setUnreadCount(count);

            // 2. Buscar últimas mensagens não lidas (para preview)
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select(`
          id,
          project_id,
          sender_id,
          message_text,
          created_at,
          sender:sender_id (
            full_name,
            profile_photo_url
          ),
          project:project_id (
            title
          )
        `)
                .eq('receiver_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            if (messagesError) throw messagesError;

            // Mapear para o tipo correto
            const messages: UnreadMessage[] = (messagesData || []).map((msg: any) => ({
                id: msg.id,
                project_id: msg.project_id,
                sender_id: msg.sender_id,
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender: {
                    full_name: msg.sender?.full_name || 'Usuário',
                    profile_photo_url: msg.sender?.profile_photo_url,
                },
                project: {
                    title: msg.project?.title || 'Projeto',
                },
            }));

            setLastMessages(messages);

            // 3. Agrupar por conversa (projeto)
            const conversationsMap = new Map<string, UnreadConversation>();

            for (const msg of messages) {
                if (!conversationsMap.has(msg.project_id)) {
                    conversationsMap.set(msg.project_id, {
                        project_id: msg.project_id,
                        project_title: msg.project.title,
                        other_user_id: msg.sender_id,
                        other_user_name: msg.sender.full_name,
                        other_user_avatar: msg.sender.profile_photo_url,
                        unread_count: 1,
                        last_message: msg.message_text,
                        last_message_at: msg.created_at,
                    });
                } else {
                    conversationsMap.get(msg.project_id)!.unread_count += 1;
                }
            }

            setUnreadConversations(Array.from(conversationsMap.values()));

        } catch (err) {
            console.error('Erro ao carregar mensagens não lidas:', err);
            setError('Erro ao carregar mensagens');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // ================================================
    // MARCAR COMO LIDA
    // ================================================

    const markProjectAsRead = useCallback(async (projectId: string) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('project_id', projectId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

            if (error) throw error;

            // Atualizar estado local
            setUnreadConversations((prev) => prev.filter((c) => c.project_id !== projectId));
            setLastMessages((prev) => prev.filter((m) => m.project_id !== projectId));

            // Recalcular contagem
            const removedCount = unreadConversations.find((c) => c.project_id === projectId)?.unread_count || 0;
            setUnreadCount((prev) => Math.max(0, prev - removedCount));

        } catch (err) {
            console.error('Erro ao marcar como lida:', err);
        }
    }, [user, unreadConversations]);

    // ================================================
    // REAL-TIME SUBSCRIPTION
    // ================================================

    useEffect(() => {
        if (!user) return;

        // Carregar dados iniciais
        loadUnreadData();

        // Subscription para novas mensagens
        const subscription = supabase
            .channel(`unread-messages:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                (payload) => {
                    // Nova mensagem recebida - recarregar dados
                    loadUnreadData();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                (payload) => {
                    // Mensagem atualizada (provavelmente marcada como lida)
                    if (payload.new && (payload.new as any).is_read) {
                        loadUnreadData();
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, loadUnreadData]);

    return {
        unreadCount,
        unreadConversations,
        lastMessages,
        loading,
        error,
        refetch: loadUnreadData,
        markProjectAsRead,
    };
}
