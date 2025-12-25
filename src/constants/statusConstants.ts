/**
 * @fileoverview Constantes de status do sistema FrameUp
 */

// ============================================
// STATUS DE PROJETO
// ============================================

export const PROJECT_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    DELIVERED: 'delivered',
    IN_REVIEW: 'in_review',
    PENDING_APPROVAL: 'pending_approval',
    REVISION_REQUESTED: 'revision_requested',
    REVISION: 'revision',
    APPROVED: 'approved',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// ============================================
// STATUS DE ENTREGA
// ============================================

export const DELIVERY_STATUS = {
    PENDING_REVIEW: 'pending_review',
    IN_REVIEW: 'in_review',
    APPROVED: 'approved',
    REVISION_REQUESTED: 'revision_requested',
    REJECTED: 'rejected',
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUS[keyof typeof DELIVERY_STATUS];

// ============================================
// STATUS DE VÍDEO EM LOTE
// ============================================

export const BATCH_VIDEO_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    DELIVERED: 'delivered',
    REVISION: 'revision',
    APPROVED: 'approved',
    COMPLETED: 'completed',
} as const;

export type BatchVideoStatus = typeof BATCH_VIDEO_STATUS[keyof typeof BATCH_VIDEO_STATUS];

// ============================================
// STATUS DE CANDIDATURA
// ============================================

export const APPLICATION_STATUS = {
    NONE: 'none',
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
} as const;

export type ApplicationStatus = typeof APPLICATION_STATUS[keyof typeof APPLICATION_STATUS];

// ============================================
// STATUS QUE PERMITEM ENTREGA
// ============================================

export const DELIVERABLE_STATUSES: string[] = [
    PROJECT_STATUS.IN_PROGRESS,
    PROJECT_STATUS.REVISION_REQUESTED,
    PROJECT_STATUS.REVISION,
    PROJECT_STATUS.PENDING,
];

export function canDeliver(status: string | undefined): boolean {
    if (!status) return false;
    return DELIVERABLE_STATUSES.includes(status);
}

// ============================================
// CONFIGURAÇÃO DE BADGES
// ============================================

export interface StatusBadgeConfig {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const STATUS_BADGE_CONFIG: Record<string, StatusBadgeConfig> = {
    [PROJECT_STATUS.OPEN]: { label: 'Aberto', variant: 'secondary' },
    [PROJECT_STATUS.PENDING]: { label: 'Aguardando', variant: 'secondary' },
    [PROJECT_STATUS.IN_PROGRESS]: { label: 'Em Andamento', variant: 'default' },
    [PROJECT_STATUS.DELIVERED]: { label: 'Entregue', variant: 'outline' },
    [PROJECT_STATUS.IN_REVIEW]: { label: 'Em Revisão', variant: 'outline' },
    [PROJECT_STATUS.PENDING_APPROVAL]: { label: 'Aguardando Aprovação', variant: 'outline' },
    [PROJECT_STATUS.REVISION_REQUESTED]: { label: 'Correções', variant: 'destructive' },
    [PROJECT_STATUS.REVISION]: { label: 'Correções', variant: 'destructive' },
    [PROJECT_STATUS.APPROVED]: { label: 'Aprovado', variant: 'default' },
    [PROJECT_STATUS.COMPLETED]: { label: 'Concluído', variant: 'default' },
    [PROJECT_STATUS.CANCELLED]: { label: 'Cancelado', variant: 'destructive' },
    [APPLICATION_STATUS.NONE]: { label: 'Sem Candidatura', variant: 'secondary' },
    [APPLICATION_STATUS.PENDING]: { label: 'Pendente', variant: 'secondary' },
    [APPLICATION_STATUS.ACCEPTED]: { label: 'Aceito', variant: 'default' },
    [APPLICATION_STATUS.REJECTED]: { label: 'Rejeitado', variant: 'destructive' },
};

export function getStatusBadgeConfig(status: string): StatusBadgeConfig {
    return STATUS_BADGE_CONFIG[status] || { label: status, variant: 'secondary' };
}
