// src/utils/alertHelpers.ts
// Helpers para geração de alertas priorizados

import { Project } from './projectHelpers';
import { getDaysAgo, getDeadlineInfo } from './dateHelpers';

export interface AlertItem {
    id: string;
    text: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

export interface Alert {
    id: string;
    type: 'review' | 'message' | 'deadline';
    priority: 1 | 2 | 3;
    title: string;
    items: AlertItem[];
    actionUrl?: string;
    actionLabel?: string;
}

export interface Message {
    id: string;
    project_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    created_at: string;
    read: boolean;
}

/**
 * Gera alertas priorizados baseado nos projetos e mensagens
 * Prioridade: 1 = Revisões, 2 = Mensagens, 3 = Deadlines
 */
export const generateAlerts = (
    projects: Project[],
    messages: Message[]
): Alert[] => {
    const alerts: Alert[] = [];

    // ========== ALERTA 1: Revisões Pendentes (Prioridade 1) ==========
    const reviewProjects = projects
        .filter(p => p.status === 'in_review')
        .sort((a, b) => {
            const dateA = new Date(a.review_requested_at || a.updated_at);
            const dateB = new Date(b.review_requested_at || b.updated_at);
            return dateA.getTime() - dateB.getTime(); // Mais antigo primeiro
        });

    if (reviewProjects.length > 0) {
        alerts.push({
            id: 'reviews',
            type: 'review',
            priority: 1,
            title: `${reviewProjects.length} vídeo${reviewProjects.length > 1 ? 's' : ''} aguardando sua revisão`,
            items: reviewProjects.slice(0, 2).map(p => {
                const daysAgo = getDaysAgo(p.review_requested_at || p.updated_at);
                return {
                    id: p.id,
                    text: `${p.title} - aguardando há ${daysAgo} dia${daysAgo > 1 ? 's' : ''}`,
                    metadata: { projectId: p.id }
                };
            }),
            actionUrl: '/creator/projects?filter=in_review',
            actionLabel: reviewProjects.length > 2 ? `Ver todos (${reviewProjects.length})` : undefined
        });
    }

    // ========== ALERTA 2: Mensagens Não Lidas (Prioridade 2) ==========
    const unreadMessages = messages.filter(m => !m.read);

    if (unreadMessages.length > 0) {
        alerts.push({
            id: 'messages',
            type: 'message',
            priority: 2,
            title: `${unreadMessages.length} mensagem${unreadMessages.length > 1 ? 'ns' : ''} não lida${unreadMessages.length > 1 ? 's' : ''} de editores`,
            items: unreadMessages.slice(0, 2).map(m => ({
                id: m.id,
                text: `${m.sender_name}: "${m.content.length > 40 ? m.content.substring(0, 40) + '...' : m.content}"`,
                timestamp: new Date(m.created_at),
                metadata: { messageId: m.id, projectId: m.project_id }
            })),
            actionLabel: unreadMessages.length > 2 ? 'Abrir mensagens' : undefined
        });
    }

    // ========== ALERTA 3: Deadlines Urgentes (Prioridade 3) ==========
    const now = new Date();
    const urgentDeadlines = projects.filter(p => {
        if (!p.deadline_at || p.status === 'completed' || p.status === 'cancelled') return false;
        const deadline = new Date(p.deadline_at);
        const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil < 48 && hoursUntil > -72; // Próximas 48h ou atrasado até 72h
    }).sort((a, b) => {
        return new Date(a.deadline_at!).getTime() - new Date(b.deadline_at!).getTime();
    });

    if (urgentDeadlines.length > 0) {
        alerts.push({
            id: 'deadlines',
            type: 'deadline',
            priority: 3,
            title: `${urgentDeadlines.length} projeto${urgentDeadlines.length > 1 ? 's' : ''} com deadline próximo`,
            items: urgentDeadlines.slice(0, 2).map(p => ({
                id: p.id,
                text: `${p.title} - ${getDeadlineInfo(p.deadline_at!).text}`,
                metadata: { projectId: p.id }
            })),
            actionUrl: '/creator/projects?sort=deadline',
            actionLabel: urgentDeadlines.length > 2 ? `Ver todos (${urgentDeadlines.length})` : undefined
        });
    }

    // Ordenar por prioridade
    return alerts.sort((a, b) => a.priority - b.priority);
};

/**
 * Retorna configuração visual para cada tipo de alerta
 */
export const getAlertConfig = (type: Alert['type']) => {
    const configs: Record<Alert['type'], {
        icon: string;
        bgColor: string;
        borderColor: string;
        textColor: string;
    }> = {
        review: {
            icon: '🔴',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            borderColor: 'border-red-200 dark:border-red-800',
            textColor: 'text-red-700 dark:text-red-400'
        },
        message: {
            icon: '💬',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            textColor: 'text-blue-700 dark:text-blue-400'
        },
        deadline: {
            icon: '⏰',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            borderColor: 'border-yellow-200 dark:border-yellow-800',
            textColor: 'text-yellow-700 dark:text-yellow-400'
        }
    };

    return configs[type];
};
