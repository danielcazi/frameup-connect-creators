import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function useUnreadMessages() {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadUnreadCount();
            const unsubscribe = subscribeToMessages();
            return unsubscribe;
        }
    }, [user]);

    async function loadUnreadCount() {
        if (!user) return;

        try {
            const { data, error } = await supabase.rpc('get_unread_messages_count', {
                p_user_id: user.id,
            });

            if (error) throw error;

            setUnreadCount(data || 0);
        } catch (error) {
            console.error('Error loading unread count:', error);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToMessages() {
        if (!user) return () => { };

        const subscription = supabase
            .channel('unread-messages')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user.id}`,
                },
                () => {
                    loadUnreadCount();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }

    return { unreadCount, loading, refetch: loadUnreadCount };
}
