import { supabase } from './supabase';

/**
 * Fluxo de status do projeto:
 * 
 * in_progress → in_review → completed
 *                   ↓           ↑
 *           revision_requested ↓
 *                   ↓
 *           pending_approval → in_review (se nova rodada paga)
 */

export type ProjectStatus =
    | 'in_progress'
    | 'in_review'
    | 'revision_requested'
    | 'pending_approval'
    | 'completed'
    | 'cancelled';

interface StatusTransition {
    from: ProjectStatus;
    to: ProjectStatus;
    action: string;
    requiresPayment?: boolean;
    incrementVersion?: boolean;
}

// Transições permitidas
export const ALLOWED_TRANSITIONS: StatusTransition[] = [
    // Editor envia primeira versão
    {
        from: 'in_progress',
        to: 'in_review',
        action: 'submit_for_review',
        incrementVersion: false,
    },
    // Creator solicita correções
    {
        from: 'in_review',
        to: 'revision_requested',
        action: 'request_revision',
        incrementVersion: false,
    },
    // Editor envia correções
    {
        from: 'revision_requested',
        to: 'pending_approval',
        action: 'submit_corrections',
        incrementVersion: false,
    },
    // Creator aprova projeto
    {
        from: 'pending_approval',
        to: 'completed',
        action: 'approve_project',
        incrementVersion: false,
    },
    // Creator paga nova rodada de revisão
    {
        from: 'pending_approval',
        to: 'revision_requested',
        action: 'pay_new_revision',
        requiresPayment: true,
        incrementVersion: true,
    },
    // Creator aprova direto da primeira revisão (sem correções necessárias)
    {
        from: 'in_review',
        to: 'completed',
        action: 'approve_first_version',
        incrementVersion: false,
    },
];

/**
 * Verifica se uma transição de status é permitida
 */
export function isTransitionAllowed(
    currentStatus: ProjectStatus,
    nextStatus: ProjectStatus,
    action: string
): boolean {
    return ALLOWED_TRANSITIONS.some(
        t => t.from === currentStatus && t.to === nextStatus && t.action === action
    );
}

/**
 * Retorna as ações disponíveis para um determinado status
 */
export function getAvailableActions(currentStatus: ProjectStatus): StatusTransition[] {
    return ALLOWED_TRANSITIONS.filter(t => t.from === currentStatus);
}

/**
 * Atualiza o status do projeto com validação
 */
export async function updateProjectStatus(
    projectId: string,
    currentStatus: ProjectStatus,
    nextStatus: ProjectStatus,
    action: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    // Validar transição
    const transition = ALLOWED_TRANSITIONS.find(
        t => t.from === currentStatus && t.to === nextStatus && t.action === action
    );

    if (!transition) {
        return {
            success: false,
            error: `Transição de ${currentStatus} para ${nextStatus} não permitida.`
        };
    }

    try {
        // Preparar atualização
        const updates: any = {
            status: nextStatus,
            updated_at: new Date().toISOString(),
        };

        // Se a transição incrementa versão, atualizar revision_count
        if (transition.incrementVersion) {
            const { data: project } = await supabase
                .from('projects')
                .select('revision_count')
                .eq('id', projectId)
                .single();

            const currentVersion = project?.revision_count || 1;
            updates.revision_count = currentVersion + 1;
        }

        // Atualizar projeto
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Error updating project status:', error);
        return {
            success: false,
            error: error.message || 'Erro ao atualizar status do projeto'
        };
    }
}

/**
 * Retorna label e cor para cada status
 */
export function getStatusInfo(status: ProjectStatus): { label: string; color: string } {
    const statusMap: Record<ProjectStatus, { label: string; color: string }> = {
        in_progress: { label: 'Em Andamento', color: '#3B82F6' },
        in_review: { label: 'Em Revisão', color: '#EF4444' },
        revision_requested: { label: 'Correções Solicitadas', color: '#A855F7' },
        pending_approval: { label: 'Aguardando Aprovação', color: '#F59E0B' },
        completed: { label: 'Concluído', color: '#22C55E' },
        cancelled: { label: 'Cancelado', color: '#6B7280' },
    };

    return statusMap[status] || { label: status, color: '#6B7280' };
}
