// src/utils/projectHelpers.ts
// Helpers para lógica de projetos e métricas

export interface Project {
    id: string;
    title: string;
    status: ProjectStatus;
    is_batch: boolean;
    batch_quantity?: number;
    videos_approved?: number;
    base_price: number;
    editor_id?: string;
    editor_name?: string;
    editor_avatar?: string;
    creator_id: string;
    video_type?: string;
    editing_style?: string;
    duration_category?: string;
    created_at: string;
    deadline_at?: string;
    review_requested_at?: string;
    completed_at?: string;
    updated_at: string;
    unread_messages?: number;
    is_archived?: boolean;
    _count?: {
        applications: number;
    };
    has_reviewed?: boolean;
    deadline_days?: number; // Calculated field
}

export type ProjectStatus =
    | 'draft'          // Rascunho
    | 'open'           // Aguardando editor
    | 'assigned'       // Editor atribuído, não começou
    | 'in_progress'    // Em produção
    | 'in_review'      // Aguardando revisão do creator
    | 'revision_requested' // Ajustes solicitados (Legacy/Fallback)
    | 'in_revision'    // Ajustes solicitados
    | 'completed'      // Concluído
    | 'cancelled';     // Cancelado

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
        if (['in_progress', 'assigned'].includes(project.status)) {
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
        if (['in_progress', 'assigned'].includes(project.status)) {
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
        const dateA = a.review_requested_at || a.updated_at;
        const dateB = b.review_requested_at || b.updated_at;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    // Aguardando Editor: por created_at (mais novo primeiro)
    groups.awaiting_editor.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Concluídos: por completed_at (mais recente primeiro)
    groups.completed.sort((a, b) => {
        const dateA = a.completed_at || a.updated_at;
        const dateB = b.completed_at || b.updated_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return groups;
};

export const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
        draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: '📝' },
        open: { label: 'Aguardando Editor', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
        in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: '🎬' },
        in_review: { label: 'Em Revisão', color: 'bg-purple-100 text-purple-800', icon: '👀' },
        revision: { label: 'Ajustes Solicitados', color: 'bg-orange-100 text-orange-800', icon: '🔄' }, // Legacy
        in_revision: { label: 'Ajustes Solicitados', color: 'bg-orange-100 text-orange-800', icon: '🔄' },
        completed: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: '✅' },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: '❌' },
        archived: { label: 'Arquivado', color: 'bg-gray-200 text-gray-600', icon: '📦' }
    };

    return configs[status] || configs.draft;
};
