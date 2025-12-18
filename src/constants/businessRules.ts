/**
 * @fileoverview Constantes de regras de negócio do FrameUp
 * Centraliza valores que antes estavam hardcoded em múltiplos arquivos
 */

// ============================================
// REVISÕES
// ============================================

/**
 * Número de revisões gratuitas incluídas em cada projeto/vídeo
 */
export const FREE_REVISIONS_LIMIT = 2;

/**
 * Porcentagem cobrada por pacote de revisões extras
 * Exemplo: 0.20 = 20% do valor do vídeo
 */
export const EXTRA_REVISION_FEE_PERCENTAGE = 0.20;

/**
 * Quantidade de revisões extras liberadas por pagamento
 */
export const EXTRA_REVISIONS_PER_PAYMENT = 2;

// ============================================
// TAXAS E COMISSÕES
// ============================================

/**
 * Porcentagem que o editor recebe do valor base do projeto
 * Exemplo: 0.85 = 85% para o editor
 */
export const EDITOR_EARNINGS_PERCENTAGE = 0.85;

/**
 * Taxa da plataforma sobre o valor do projeto
 * Exemplo: 0.15 = 15% de taxa
 */
export const PLATFORM_FEE_PERCENTAGE = 0.15;

/**
 * Taxa da plataforma sobre revisões extras
 */
export const PLATFORM_FEE_ON_EXTRA_REVISIONS = 0.15;

// ============================================
// LIMITES E CONFIGURAÇÕES
// ============================================

export const MAX_VIDEO_DURATION_SECONDS = 3600;
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
export const MIN_DEADLINE_DAYS = 1;
export const MAX_DEADLINE_DAYS = 30;

// ============================================
// HELPERS
// ============================================

export function calculateEditorEarnings(
    basePrice: number,
    customPercentage?: number
): number {
    const percentage = customPercentage ?? EDITOR_EARNINGS_PERCENTAGE;
    return basePrice * percentage;
}

export function calculateExtraRevisionCost(editorEarningsPerVideo: number): number {
    return editorEarningsPerVideo * EXTRA_REVISION_FEE_PERCENTAGE;
}

export function needsPaymentForRevision(
    revisionCount: number,
    hasPaidExtraRevisions: boolean
): boolean {
    return revisionCount >= FREE_REVISIONS_LIMIT && !hasPaidExtraRevisions;
}

export function calculateFreeRevisionsRemaining(revisionCount: number): number {
    return Math.max(0, FREE_REVISIONS_LIMIT - revisionCount);
}
