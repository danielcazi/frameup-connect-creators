import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/common/EmptyState';
import { MessageSquare, Loader2 } from 'lucide-react';

interface Conversation {
    project_id: string;
    project_title: string;
    project_status: string;
    other_user_id: string;
    other_user_name: string;
    other_user_username: string;
    other_user_avatar?: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
    is_creator: boolean;
}

function Messages() {
    const { user, userType } = useAuth();
    const navigate = useNavigate();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadConversations();
            const unsubscribe = subscribeToMessages();
            return unsubscribe;
        }
    }, [user]);

    async function loadConversations() {
        if (!user) return;

        try {
            setLoading(true);

            // Buscar projetos onde usuário participa
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select(`
          id,
          title,
          status,
          creator_id,
          assigned_editor_id,
          created_at,
          users_creator:users!projects_creator_id_fkey (
            id,
            full_name,
            username,
            profile_photo_url
          ),
          users_editor:users!projects_assigned_editor_id_fkey (
            id,
            full_name,
            username,
            profile_photo_url
          )
        `)
                .or(`creator_id.eq.${user.id},assigned_editor_id.eq.${user.id}`)
                .in('status', ['in_progress', 'in_review']);

            if (projectsError) throw projectsError;

            // Para cada projeto, buscar última mensagem e count de não lidas
            const conversationsData = await Promise.all(
                (projects || []).map(async (project) => {
                    // Última mensagem
                    const { data: lastMessage } = await supabase
                        .from('messages')
                        .select('message_text, created_at')
                        .eq('project_id', project.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    // Mensagens não lidas
                    const { count: unreadCount } = await supabase
                        .from('messages')
                        .select('id', { count: 'exact', head: true })
                        .eq('project_id', project.id)
                        .eq('receiver_id', user.id)
                        .eq('is_read', false);

                    const isCreator = project.creator_id === user.id;
                    const otherUser = isCreator ? project.users_editor : project.users_creator;

                    return {
                        project_id: project.id,
                        project_title: project.title,
                        project_status: project.status,
                        other_user_id: otherUser.id,
                        other_user_name: otherUser.full_name,
                        other_user_username: otherUser.username,
                        other_user_avatar: otherUser.profile_photo_url,
                        last_message: lastMessage?.message_text || 'Nenhuma mensagem ainda',
                        last_message_at: lastMessage?.created_at || project.created_at,
                        unread_count: unreadCount || 0,
                        is_creator: isCreator,
                    };
                })
            );

            // Ordenar por última mensagem
            conversationsData.sort(
                (a, b) =>
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
            );

            setConversations(conversationsData);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    }

    function subscribeToMessages() {
        if (!user) return () => { };

        const subscription = supabase
            .channel('all-messages')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                },
                () => {
                    loadConversations();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }

    function getTimeAgo(date: string) {
        const now = new Date();
        const messageDate = new Date(date);
        const diffInMinutes = Math.floor(
            (now.getTime() - messageDate.getTime()) / (1000 * 60)
        );

        if (diffInMinutes < 1) return 'Agora';
        if (diffInMinutes < 60) return `${diffInMinutes}m`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Ontem';
        if (diffInDays < 7) return `${diffInDays}d`;

        return messageDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
        });
    }

    function handleConversationClick(conversation: Conversation) {
        const path = conversation.is_creator
            ? `/creator/project/${conversation.project_id}/chat`
            : `/editor/project/${conversation.project_id}/chat`;

        navigate(path);
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return (
            <DashboardLayout
                userType={userType as 'creator' | 'editor'}
                title="Mensagens"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Mensagens"
            subtitle="Todas as suas conversas"
        >
            <div className="max-w-4xl mx-auto">
                {conversations.length === 0 ? (
                    <EmptyState
                        illustration="messages"
                        title="Nenhuma conversa ainda"
                        description="Suas conversas com editores/creators aparecerão aqui quando você tiver projetos em andamento."
                    />
                ) : (
                    <Card className="p-0">
                        <div className="divide-y divide-border">
                            {conversations.map((conversation) => (
                                <button
                                    key={conversation.project_id}
                                    onClick={() => handleConversationClick(conversation)}
                                    className={`w-full p-6 text-left hover:bg-accent transition-colors ${conversation.unread_count > 0 ? 'bg-primary/5' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <Avatar className="w-12 h-12 flex-shrink-0">
                                            <AvatarImage
                                                src={conversation.other_user_avatar}
                                                alt={conversation.other_user_name}
                                            />
                                            <AvatarFallback>
                                                {getInitials(conversation.other_user_name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 mb-1">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground truncate">
                                                        {conversation.other_user_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {conversation.project_title}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                    <span className="text-xs text-muted-foreground">
                                                        {getTimeAgo(conversation.last_message_at)}
                                                    </span>

                                                    {conversation.unread_count > 0 && (
                                                        <Badge variant="default" className="h-5 px-2">
                                                            {conversation.unread_count}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Last Message */}
                                            <p
                                                className={`text-sm truncate ${conversation.unread_count > 0
                                                        ? 'text-foreground font-medium'
                                                        : 'text-muted-foreground'
                                                    }`}
                                            >
                                                {conversation.last_message}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}

export default Messages;
