import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import EmptyState from '@/components/common/EmptyState';
import {
    ArrowLeft,
    MessageSquare,
    Loader2,
    Briefcase,
} from 'lucide-react';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    message_text: string;
    is_read: boolean;
    created_at: string;
    attachment_url?: string;
}

interface Project {
    id: string;
    title: string;
    status: string;
    creator_id: string;
    assigned_editor_id: string;
    users_creator: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    users_editor: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
}

interface ChatProps {
    isAdminView?: boolean;
    projectId?: string;
    isEmbedded?: boolean;
    readOnly?: boolean; // 🆕 Added prop
}

function Chat({ isAdminView = false, projectId, isEmbedded = false, readOnly = false }: ChatProps) {

    const { id: paramId } = useParams(); // project_id
    const id = projectId || paramId;
    const { user, userType } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id && user) {
            loadProject();
            loadMessages();
            const unsubscribe = subscribeToMessages();
            // Admins don't mark messages as read to avoid messing up user status
            if (!isAdminView) {
                markMessagesAsRead();
            }
            return unsubscribe;
        }
    }, [id, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    async function loadProject() {
        if (!id || !user) return;

        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
          id,
          title,
          status,
          creator_id,
          assigned_editor_id,
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
                .eq('id', id)
                .single();

            if (error) throw error;

            // Verificar se usuário tem acesso ao chat
            const isCreator = data.creator_id === user.id;
            const isAssignedEditor = data.assigned_editor_id === user.id;

            if (!isAdminView && !isEmbedded && !isCreator && !isAssignedEditor) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Você não tem acesso a este chat',
                });
                navigate(userType === 'creator' ? '/creator/dashboard' : '/editor/dashboard');
                return;
            }

            if (!isAdminView && !isEmbedded && data.status !== 'in_progress' && data.status !== 'in_review') {
                toast({
                    variant: 'destructive',
                    title: 'Chat indisponível',
                    description: 'Chat não está disponível para este projeto',
                });
                navigate(userType === 'creator' ? '/creator/dashboard' : '/editor/dashboard');
                return;
            }

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            if (!isEmbedded) {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Erro ao carregar projeto',
                });
                if (!isAdminView) {
                    navigate(userType === 'creator' ? '/creator/dashboard' : '/editor/dashboard');
                }
            }
        }
    }

    async function loadMessages() {
        if (!id) return;

        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('project_id', id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            setMessages(data || []);
        } catch (error) {
            console.error('Error loading messages:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar mensagens',
            });
        } finally {
            setLoading(false);
        }
    }

    function subscribeToMessages() {
        if (!id || !user) return () => { };

        const subscription = supabase
            .channel(`messages:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${id}`,
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages((prev) => {
                        // Evitar duplicatas se a mensagem já foi adicionada manualmente
                        if (prev.some(msg => msg.id === newMessage.id)) {
                            return prev;
                        }
                        return [...prev, newMessage];
                    });

                    // Se não é a própria mensagem e não é admin, marcar como lida
                    if (!isAdminView && newMessage.sender_id !== user.id) {
                        markMessageAsRead(newMessage.id);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `project_id=eq.${id}`,
                },
                (payload) => {
                    const updatedMessage = payload.new as Message;
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg))
                    );
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        return () => {
            subscription.unsubscribe();
        };
    }

    async function markMessagesAsRead() {
        if (!id || !user) return;

        try {
            await supabase.rpc('mark_project_messages_as_read', {
                p_project_id: id,
                p_user_id: user.id,
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }

    async function markMessageAsRead(messageId: string) {
        if (!user) return;

        try {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', messageId)
                .eq('receiver_id', user.id);
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async function handleSendMessage(text: string) {
        if (!project || !user || !id) return;

        setSending(true);

        try {
            // Determinar receiver_id
            const receiverId =
                user.id === project.creator_id
                    ? project.assigned_editor_id
                    : project.creator_id;

            const { data, error } = await supabase
                .from('messages')
                .insert({
                    project_id: id,
                    sender_id: user.id,
                    receiver_id: receiverId,
                    message_text: text,
                })
                .select()
                .single();

            if (error) throw error;

            // Adicionar mensagem localmente para feedback instantâneo
            if (data) {
                setMessages((prev) => [...prev, data as Message]);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao enviar mensagem',
            });
        } finally {
            setSending(false);
        }
    }

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    function groupMessagesByDate(messages: Message[]) {
        const groups: Record<string, Message[]> = {};

        messages.forEach((message) => {
            const date = new Date(message.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            });

            if (!groups[date]) {
                groups[date] = [];
            }

            groups[date].push(message);
        });

        return groups;
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading || !project) {
        // If loaded in admin tab, show simple loader without layout
        if (isAdminView) {
            return (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            );
        }

        return (
            <DashboardLayout
                userType={userType as 'creator' | 'editor'}
                title="Chat"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const otherUser = isAdminView
        ? null // In admin view, we see everyone's messages, no "other user" concept for header specific to one side
        : (user?.id === project.creator_id ? project.users_editor : project.users_creator);

    const messageGroups = groupMessagesByDate(messages);

    const ChatContent = (
        <div className={`flex flex-col h-full ${isAdminView || isEmbedded ? '' : 'max-w-5xl mx-auto h-[calc(100vh-200px)]'}`}>
            {!isAdminView && !isEmbedded && (
                <Card className="mb-4 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    navigate(
                                        userType === 'creator'
                                            ? '/creator/dashboard'
                                            : '/editor/dashboard'
                                    )
                                }
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>

                            <div className="h-8 w-px bg-border" />

                            <Avatar className="w-10 h-10">
                                <AvatarImage src={otherUser?.profile_photo_url} alt={otherUser?.full_name} />
                                <AvatarFallback>{getInitials(otherUser?.full_name || '?')}</AvatarFallback>
                            </Avatar>

                            <div>
                                <p className="font-semibold text-foreground">{otherUser?.full_name || 'Usuário'}</p>
                                <p className="text-sm text-muted-foreground">@{otherUser?.username || 'usuario'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    userType === 'creator'
                                        ? navigate(`/creator/project/${id}`)
                                        : navigate(`/editor/project/${id}`)
                                }
                            >
                                <Briefcase className="w-4 h-4 mr-2" />
                                Ver Projeto
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Messages Container */}
            <Card className={`flex-1 flex flex-col overflow-hidden p-0 ${isAdminView ? 'border-0 shadow-none rounded-none' : ''}`}>
                {/* Messages Area */}
                <div
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <EmptyState
                                illustration="messages"
                                title="Nenhuma mensagem ainda"
                                description={isAdminView ? "Não há mensagens neste projeto." : "Envie a primeira mensagem para iniciar a conversa!"}
                            />
                        </div>
                    ) : (
                        Object.entries(messageGroups).map(([date, groupMessages]) => (
                            <div key={date}>
                                {/* Date Separator */}
                                <div className="flex items-center justify-center mb-4">
                                    <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
                                        {date}
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="space-y-3">
                                    {groupMessages.map((message) => {
                                        // Helper to find author details
                                        const isCreator = message.sender_id === project.creator_id;
                                        const author = isCreator ? project.users_creator : project.users_editor;
                                        const isOwn = message.sender_id === user?.id; // Should be false for admin usually

                                        return (
                                            <MessageBubble
                                                key={message.id}
                                                message={message}
                                                isOwn={isOwn}
                                                senderName={
                                                    isOwn
                                                        ? 'Você'
                                                        : author?.full_name || 'Usuário'
                                                }
                                                senderAvatar={
                                                    author?.profile_photo_url
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input - Hide if Admin or ReadOnly */}
                {!isAdminView && !readOnly && (
                    <div className="border-t border-border p-4 bg-card">
                        <MessageInput onSend={handleSendMessage} disabled={sending} />
                    </div>
                )}

                {/* Read Only Message */}
                {readOnly && (
                    <div className="border-t border-border p-4 bg-muted/30 text-center">
                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                            🔒 Chat pausado durante a revisão
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );

    if (isAdminView || isEmbedded) {
        return ChatContent;
    }

    return (
        <DashboardLayout
            userType={userType as 'creator' | 'editor'}
            title="Chat"
            subtitle={project.title}
        >
            {ChatContent}
        </DashboardLayout>
    );
}

export default Chat;
