// src/utils/batchHelpers.ts
// Helpers para lógica de lotes de vídeos

export type BatchVideoStatus =
    | 'pending'           // Aguardando início
    | 'in_progress'       // Editor trabalhando
    | 'delivered'         // Entregue, aguardando revisão (awaiting_review)
    | 'revision'          // Creator solicitou revisão (in_revision)
    | 'approved';         // Aprovado pelo creator

export interface BatchVideo {
    id: string;
    project_id: string;
    sequence_order: number;
    title?: string;
    status: BatchVideoStatus;
    progress_percent?: number;
    delivery_url?: string;
    approved_at?: string;
    released_at?: string;
    created_at: string;
    updated_at: string;
}

export interface BatchStats {
    total: number;
    pending: number;
    inProgress: number;
    awaitingReview: number;
    inRevision: number;
    approved: number;
    percentComplete: number;
}

/**
 * Calcula estatísticas do lote de vídeos
 */
export function calculateBatchStats(batchVideos: BatchVideo[]): BatchStats {
    const total = batchVideos.length;

    const stats = {
        total,
        pending: batchVideos.filter(v => v.status === 'pending').length,
        inProgress: batchVideos.filter(v => v.status === 'in_progress').length,
        awaitingReview: batchVideos.filter(v => v.status === 'delivered').length,
        inRevision: batchVideos.filter(v => v.status === 'revision').length,
        approved: batchVideos.filter(v => v.status === 'approved').length,
        percentComplete: 0
    };

    // Calcular percentual de conclusão baseado apenas em aprovados
    stats.percentComplete = total > 0
        ? Math.round((stats.approved / total) * 100)
        : 0;

    return stats;
}

/**
 * Calcula o status global do projeto baseado nos vídeos do lote
 * CRÍTICO: Projeto só é "completed" quando TODOS os vídeos estão aprovados
 */
export function calculateProjectStatus(batchVideos: BatchVideo[]): string {
    if (!batchVideos || batchVideos.length === 0) {
        return 'pending';
    }

    const stats = calculateBatchStats(batchVideos);

    // REGRA CRÍTICA: Só é "completed" se TODOS foram aprovados
    if (stats.approved === stats.total) {
        return 'completed';
    }

    // Algum vídeo aguardando revisão do creator
    if (stats.awaitingReview > 0) {
        return 'in_review'; // Project status enum usually has 'in_review' or 'delivered'? Let's check ProjectHeader. It has 'delivered' but mapped to Package icon. 
        // But Project header statusConfig uses keys: pending, pending_acceptance, in_progress, delivered, revision, completed.
        // So I should return 'delivered' if awaiting review.
        return 'delivered';
    }

    // Algum vídeo em revisão (creator pediu ajustes)
    if (stats.inRevision > 0) {
        return 'revision';
    }

    // Algum vídeo em progresso
    if (stats.inProgress > 0) {
        return 'in_progress';
    }

    // Todos pendentes
    return 'pending';
}

/**
 * Verifica se um vídeo pode ser editado (liberação sequencial)
 */
export function canEditVideo(
    batchVideos: BatchVideo[],
    currentVideoIndex: number,
    deliveryMode: 'sequential' | 'simultaneous'
): boolean {
    // Modo simultâneo: todos liberados desde o início
    if (deliveryMode === 'simultaneous') {
        return true;
    }

    // Modo sequencial: primeiro vídeo sempre liberado
    if (currentVideoIndex === 0) {
        return true;
    }

    // Sequencial: só libera se anterior foi aprovado
    const previousVideo = batchVideos[currentVideoIndex - 1];
    return previousVideo?.status === 'approved';
}

/**
 * Retorna configuração visual para cada status de vídeo
 */
export function getVideoStatusConfig(status: BatchVideoStatus) {
    const configs: Record<BatchVideoStatus, {
        icon: string;
        label: string;
        description: string;
        badgeClass: string;
        bgColor: string;
        textColor: string;
    }> = {
        pending: {
            icon: '⏳',
            label: 'Aguardando',
            description: 'Este vídeo ainda não foi iniciado pelo editor',
            badgeClass: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            textColor: 'text-gray-600 dark:text-gray-400'
        },
        in_progress: {
            icon: '🎬',
            label: 'Em Progresso',
            description: 'O editor está trabalhando neste vídeo',
            badgeClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            textColor: 'text-blue-700 dark:text-blue-400'
        },
        delivered: { // was awaiting_review
            icon: '👀',
            label: 'Aguardando Revisão',
            description: 'Vídeo entregue! Revise e aprove para liberar o próximo',
            badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
            bgColor: 'bg-orange-100 dark:bg-orange-900/30',
            textColor: 'text-orange-700 dark:text-orange-400'
        },
        revision: { // was in_revision
            icon: '🔄',
            label: 'Em Revisão',
            description: 'Editor está ajustando conforme seu feedback',
            badgeClass: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
            textColor: 'text-yellow-700 dark:text-yellow-400'
        },
        approved: {
            icon: '✅',
            label: 'Aprovado',
            description: 'Vídeo aprovado e finalizado',
            badgeClass: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-900/30',
            textColor: 'text-green-700 dark:text-green-400'
        }
    };

    return configs[status] || configs.pending;
}

/**
 * Calcula o valor total do projeto considerando quantidade do lote
 */
export function calculateProjectTotalValue(
    basePrice: number,
    batchQuantity: number = 1,
    discountPercent: number = 0
): {
    totalBeforeDiscount: number;
    discountAmount: number;
    totalAfterDiscount: number;
    pricePerVideo: number;
} {
    const totalBeforeDiscount = basePrice * batchQuantity;
    const discountAmount = totalBeforeDiscount * (discountPercent / 100);
    const totalAfterDiscount = totalBeforeDiscount - discountAmount;
    const pricePerVideo = batchQuantity > 0 ? totalAfterDiscount / batchQuantity : basePrice;

    return {
        totalBeforeDiscount,
        discountAmount,
        totalAfterDiscount,
        pricePerVideo
    };
}
