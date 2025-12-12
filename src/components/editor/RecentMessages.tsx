import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';

interface RecentMessagesProps {
    limit?: number;
}

interface Conversation {
    project_id: string;
    other_user_name: string;
    other_user_avatar?: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

export function RecentMessages({ limit = 3 }: RecentMessagesProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user]);

    async function loadConversations() {
        if (!user) return;

        try {
            // Reusing logic from Messages.tsx but simplified
            // Fetch projects where user is involved
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select(`
                    id,
                    creator_id,
                    assigned_editor_id,
                    users_creator:users!projects_creator_id_fkey (
                        id, full_name, profile_photo_url
                    ),
                    users_editor:users!projects_assigned_editor_id_fkey (
                        id, full_name, profile_photo_url
                    )
                `)
                .or(`creator_id.eq.${user.id},assigned_editor_id.eq.${user.id}`)
                .in('status', ['in_progress', 'in_review'])
                .order('updated_at', { ascending: false })
                .limit(limit * 2); // Fetch a bit more to filter

            if (projectsError) throw projectsError;

            // Fetch last message for these projects
            const convs = await Promise.all(
                (projects || []).map(async (project) => {
                    const { data: lastMessage } = await supabase
                        .from('messages')
                        .select('message_text, created_at')
                        .eq('project_id', project.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (!lastMessage) return null;

                    const isCreator = project.creator_id === user.id;
                    const otherUser = isCreator ? project.users_editor : project.users_creator;

                    return {
                        project_id: project.id,
                        other_user_name: otherUser.full_name,
                        other_user_avatar: otherUser.profile_photo_url,
                        last_message: lastMessage.message_text,
                        last_message_at: lastMessage.created_at,
                        unread_count: 0 // Simplification for dashboard widget
                    };
                })
            );

            // Filter nulls and sort
            const validConvs = convs
                .filter((c): c is Conversation => c !== null)
                .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
                .slice(0, limit);

            setConversations(validConvs);
        } catch (error) {
            console.error('Error loading recent messages:', error);
        } finally {
            setLoading(false);
        }
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
        return <div className="animate-pulse space-y-4">
            {[...Array(limit)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
        </div>;
    }

    if (conversations.length === 0) {
        return (
            <div className="text-center py-8 bg-muted/30 rounded-lg border border-border">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem recente</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {conversations.map((conv) => (
                <div
                    key={conv.project_id}
                    onClick={() => navigate(`/editor/project/${conv.project_id}/chat`)}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-accent cursor-pointer transition-colors"
                >
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={conv.other_user_avatar} />
                        <AvatarFallback>{getInitials(conv.other_user_name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                            <p className="font-medium text-sm truncate text-foreground">
                                {conv.other_user_name}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(conv.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
