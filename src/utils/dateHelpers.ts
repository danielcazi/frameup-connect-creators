// src/utils/dateHelpers.ts
// Helpers para manipulação e formatação de datas

/**
 * Calcula quantos dias se passaram desde uma data
 */
export const getDaysAgo = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Formata timestamp para exibição relativa
 * Ex: "há 2 horas", "há 3 dias", "há 1 semana"
 */
export const formatTimestamp = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'agora';
    if (diffMinutes < 60) return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semana${diffDays >= 14 ? 's' : ''}`;

    return date.toLocaleDateString('pt-BR');
};

/**
 * Retorna informações sobre o deadline de um projeto
 */
export interface DeadlineInfo {
    text: string;
    color: 'red' | 'orange' | 'yellow' | 'gray';
    urgent: boolean;
}

export const getDeadlineInfo = (deadlineString: string): DeadlineInfo => {
    const deadline = new Date(deadlineString);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffDays < 0) {
        return {
            text: `Atrasado há ${Math.abs(diffDays)} dia${Math.abs(diffDays) > 1 ? 's' : ''}`,
            color: 'red',
            urgent: true
        };
    } else if (diffHours < 24) {
        return {
            text: diffHours <= 0 ? 'Entrega hoje!' : `Faltam ${diffHours} hora${diffHours > 1 ? 's' : ''}`,
            color: 'red',
            urgent: true
        };
    } else if (diffDays === 1) {
        return {
            text: 'Entrega amanhã',
            color: 'orange',
            urgent: true
        };
    } else if (diffDays <= 3) {
        return {
            text: `Entrega em ${diffDays} dias`,
            color: 'yellow',
            urgent: false
        };
    } else {
        return {
            text: `Entrega em ${diffDays} dias`,
            color: 'gray',
            urgent: false
        };
    }
};

/**
 * Calcula tempo aguardando revisão
 */
export const getReviewWaitTime = (reviewRequestedAt: string) => {
    const days = getDaysAgo(reviewRequestedAt);
    return {
        days,
        isUrgent: days > 3,
        text: days === 0 ? 'hoje' : `há ${days} dia${days > 1 ? 's' : ''}`
    };
};
