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
            // Fetch projects where user is involved (as creator)
            // We only care about projects where we are the creator (since this is Creator Dashboard)
            const { data: projects, error: projectsError } = await supabase
                .from('projects')
                .select(`
                    id,
                    creator_id,
                    assigned_editor_id,
                    users_editor:users!projects_assigned_editor_id_fkey (
                        id, full_name, profile_photo_url
                    )
                `)
                .eq('creator_id', user.id)
                // Filter for active projects mostly, but messages can be in any
                .in('status', ['in_progress', 'in_review', 'revision_requested', 'completed'])
                .not('assigned_editor_id', 'is', null) // Must have an editor
                .order('updated_at', { ascending: false })
                .limit(limit * 3); // Fetch more to filter down to those with messages

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

                    // access the nested users_editor object safely
                    const editor = project.users_editor as any; // Type assertion since Supabase types might be loose here
                    if (!editor) return null;

                    return {
                        project_id: project.id,
                        other_user_name: editor.full_name || 'Editor',
                        other_user_avatar: editor.profile_photo_url,
                        last_message: lastMessage.message_text,
                        last_message_at: lastMessage.created_at,
                        unread_count: 0
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
        return <div className="space-y-3">
            {[...Array(limit)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg w-full animate-pulse" />
            ))}
        </div>;
    }

    if (conversations.length === 0) {
        return (
            <div className="text-center py-6 bg-muted/20 rounded-lg border border-border">
                <MessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem recente</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {conversations.map((conv) => (
                <div
                    key={conv.project_id}
                    onClick={() => navigate(`/creator/project/${conv.project_id}/chat`)}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                    <Avatar className="w-9 h-9 border border-border">
                        <AvatarImage src={conv.other_user_avatar} />
                        <AvatarFallback>{getInitials(conv.other_user_name)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                            <p className="font-medium text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                {conv.other_user_name}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(conv.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate leading-none">
                            {conv.last_message}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
