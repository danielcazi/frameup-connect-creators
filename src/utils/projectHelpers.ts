// src/utils/projectHelpers.ts
// Helpers para lógica de projetos e métricas

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES DO PROJETO
// ═══════════════════════════════════════════════════════════════════════════════

export type ProjectStatus =
    | 'draft'
    | 'open'
    | 'in_progress'
    | 'in_review'
    | 'revision_requested'
    | 'pending_approval'
    | 'completed'
    | 'cancelled'
    | 'archived';

export type BatchVideoStatus =
    | 'pending'
    | 'in_progress'
    | 'delivered'
    | 'in_review'
    | 'revision_requested'
    | 'approved'
    | 'completed';

export interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title: string;
    status: BatchVideoStatus;
    specific_instructions?: string | null;
    delivery_id?: string | null;
    delivery_url?: string | null;
    approved_at?: string | null;
    revision_count?: number;
    progress_percent?: number;
    created_at: string;
    updated_at: string;
}

export interface Project {
    id: string;
    title: string;
    description?: string;
    status: ProjectStatus;
    base_price: number;
    deadline_days?: number;
    created_at: string;
    updated_at?: string;
    is_batch: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: 'sequential' | 'simultaneous';
    batch_discount_percent?: number;
    batch_videos?: BatchVideo[];
    editor_earnings_per_video?: number;
    editor_earnings_released?: number;
    videos_approved?: number;
    is_archived?: boolean;
    revision_count?: number;
    assigned_editor_id?: string;
    assigned_editor?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };
    _count?: {
        applications: number;
    };
    has_reviewed?: boolean;
    users?: {
        id: string;
        full_name: string;
        username: string;
        profile_photo_url?: string;
    };

    // Legacy / Existing fields kept for compatibility
    creator_id?: string;
    editor_id?: string;
    editor_name?: string;
    editor_avatar?: string;
    video_type?: string;
    editing_style?: string;
    duration_category?: string;
    deadline_at?: string;
    review_requested_at?: string;
    completed_at?: string;
    unread_messages?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PARA BATCH (NOVOS)
// ═══════════════════════════════════════════════════════════════════════════════

// Calcula status agregado do projeto mãe
export function calculateBatchAggregatedStatus(batchVideos: BatchVideo[]): ProjectStatus {
    if (!batchVideos || batchVideos.length === 0) return 'draft';

    const allCompleted = batchVideos.every(v =>
        v.status === 'completed' || v.status === 'approved'
    );
    if (allCompleted) return 'completed';

    const anyInReview = batchVideos.some(v =>
        ['in_review', 'delivered'].includes(v.status)
    );
    if (anyInReview) return 'in_review';

    const anyRevisionRequested = batchVideos.some(v =>
        v.status === 'revision_requested'
    );
    if (anyRevisionRequested) return 'in_progress';

    const anyInProgress = batchVideos.some(v =>
        v.status === 'in_progress'
    );
    if (anyInProgress) return 'in_progress';

    const allPending = batchVideos.every(v => v.status === 'pending');
    if (allPending) return 'open';

    return 'in_progress';
}

export interface BatchProgress {
    total: number;
    completed: number;
    inReview: number;
    inProgress: number;
    revisionRequested: number;
    pending: number;
    percentage: number;
    hasDelayed: boolean;
    delayedCount: number;
}

export function calculateBatchProgress(
    batchVideos: BatchVideo[],
    projectDeadlineDays?: number
): BatchProgress {
    if (!batchVideos || batchVideos.length === 0) {
        return {
            total: 0, completed: 0, inReview: 0, inProgress: 0,
            revisionRequested: 0, pending: 0, percentage: 0,
            hasDelayed: false, delayedCount: 0
        };
    }

    const total = batchVideos.length;
    const completed = batchVideos.filter(v =>
        v.status === 'completed' || v.status === 'approved'
    ).length;
    const inReview = batchVideos.filter(v =>
        ['in_review', 'delivered'].includes(v.status)
    ).length;
    const inProgress = batchVideos.filter(v => v.status === 'in_progress').length;
    const revisionRequested = batchVideos.filter(v => v.status === 'revision_requested').length;
    const pending = batchVideos.filter(v => v.status === 'pending').length;

    const hasDelayed = projectDeadlineDays !== undefined && projectDeadlineDays < 0;
    const delayedCount = hasDelayed ? (total - completed) : 0;

    return {
        total, completed, inReview, inProgress, revisionRequested, pending,
        percentage: Math.round((completed / total) * 100),
        hasDelayed, delayedCount
    };
}

export function mapBatchVideoStatusToKanbanColumn(status: BatchVideoStatus): string {
    switch (status) {
        case 'pending': return 'awaiting_editor';
        case 'in_progress': return 'in_progress';
        case 'delivered':
        case 'in_review': return 'in_review';
        case 'revision_requested': return 'revision_requested';
        case 'approved':
        case 'completed': return 'completed';
        default: return 'in_progress';
    }
}

export function canArchiveBatch(batchVideos: BatchVideo[]): boolean {
    if (!batchVideos || batchVideos.length === 0) return false;
    return batchVideos.every(v => v.status === 'completed' || v.status === 'approved');
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS EXISTENTES (LEGACY/DASHBOARD)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DashboardMetrics {
    inProduction: number;
    awaitingReview: number;
    completed: number;
    total: number;
}

/**
 * Calcula métricas do dashboard baseado nos projetos
 * Para projetos em lote, conta batch_quantity como vídeos individuais
 */
export const calculateDashboardMetrics = (projects: Project[]): DashboardMetrics => {
    const metrics: DashboardMetrics = {
        inProduction: 0,
        awaitingReview: 0,
        completed: 0,
        total: 0
    };

    projects.forEach(project => {
        // Calcular quantidade de vídeos do projeto
        const videoCount = project.is_batch
            ? (project.batch_quantity || 1)
            : 1;

        // Total geral (exceto cancelados)
        if (project.status !== 'cancelled') {
            metrics.total += videoCount;
        }

        // Por status
        if (['in_progress'].includes(project.status)) {
            metrics.inProduction += videoCount;
        } else if (project.status === 'in_review') {
            metrics.awaitingReview += videoCount;
        } else if (project.status === 'completed') {
            metrics.completed += videoCount;
        }
    });

    return metrics;
};

/**
 * Agrupa projetos por status para exibição na lista
 */
export interface GroupedProjects {
    in_production: Project[];
    awaiting_review: Project[];
    awaiting_editor: Project[];
    completed: Project[];
}

export const groupProjectsByStatus = (projects: Project[]): GroupedProjects => {
    const groups: GroupedProjects = {
        in_production: [],
        awaiting_review: [],
        awaiting_editor: [],
        completed: []
    };

    projects.forEach(project => {
        if (['in_progress'].includes(project.status)) {
            groups.in_production.push(project);
        } else if (project.status === 'in_review') {
            groups.awaiting_review.push(project);
        } else if (project.status === 'open') {
            groups.awaiting_editor.push(project);
        } else if (project.status === 'completed') {
            groups.completed.push(project);
        }
    });

    // Ordenar cada grupo
    // Em Produção: por deadline (mais urgente primeiro)
    groups.in_production.sort((a, b) => {
        if (!a.deadline_at) return 1;
        if (!b.deadline_at) return -1;
        return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime();
    });

    // Aguardando Revisão: por review_requested_at (mais antigo primeiro)
    groups.awaiting_review.sort((a, b) => {
        const dateA = a.review_requested_at || a.updated_at || '';
        const dateB = b.review_requested_at || b.updated_at || '';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Aguardando Editor: por created_at (mais novo primeiro)
    groups.awaiting_editor.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Concluídos: por completed_at (mais recente primeiro)
    groups.completed.sort((a, b) => {
        const dateA = a.completed_at || a.updated_at || '';
        const dateB = b.completed_at || b.updated_at || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return groups;
};

export const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
        draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: '📝' },
        open: { label: 'Aguardando Editor', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
        assigned: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: '🎬' },
        in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: '🎬' },
        in_review: { label: 'Em Revisão', color: 'bg-purple-100 text-purple-800', icon: '👀' },
        revision_requested: { label: 'Ajustes Solicitados', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
        revision: { label: 'Ajustes Solicitados', color: 'bg-orange-100 text-orange-800', icon: '🔄' }, // Legacy
        in_revision: { label: 'Ajustes Solicitados', color: 'bg-orange-100 text-orange-800', icon: '🔄' }, // Legacy
        pending_approval: { label: 'Aguardando Aprovação', color: 'bg-indigo-100 text-indigo-800', icon: '👍' },
        completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: '✅' },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' },
        archived: { label: 'Arquivado', color: 'bg-gray-200 text-gray-600', icon: '📦' }
    };

    return configs[status] || configs.draft;
};
