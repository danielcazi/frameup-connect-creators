import { supabase } from '@/lib/supabase';
import { Dispute, DisputeWithDetails, DisputePriority, DisputeStatus } from '@/types/admin';

// Listar disputas
export async function getDisputes(
    status?: DisputeStatus,
    priority?: DisputePriority,
    assignedTo?: string
) {
    try {
        let query = supabase
            .from('disputes')
            .select(`
        *,
        project:projects!project_id (id, title, base_price, status),
        opened_by_user:auth.users!opened_by (id, email),
        disputed_user:auth.users!disputed_user_id (id, email)
      `)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (priority) query = query.eq('priority', priority);
        if (assignedTo) query = query.eq('assigned_to', assignedTo);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar disputas:', error);
        throw error;
    }
}

// Buscar detalhes completos de uma disputa
export async function getDisputeDetails(disputeId: string): Promise<DisputeWithDetails | null> {
    try {
        const { data: dispute, error: disputeError } = await supabase
            .from('disputes')
            .select(`
        *,
        project:projects!project_id (id, title, base_price, status),
        opened_by_user:auth.users!opened_by (id, email),
        disputed_user:auth.users!disputed_user_id (id, email)
      `)
            .eq('id', disputeId)
            .single();

        if (disputeError) throw disputeError;

        const { data: messages, error: messagesError } = await supabase
            .from('dispute_messages')
            .select('*')
            .eq('dispute_id', disputeId)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        return {
            ...dispute,
            messages: messages || [],
        } as DisputeWithDetails;
    } catch (error) {
        console.error('Erro ao buscar detalhes da disputa:', error);
        return null;
    }
}

// Atribuir disputa para admin
export async function assignDispute(disputeId: string, adminId: string) {
    try {
        const { error } = await supabase
            .from('disputes')
            .update({
                assigned_to: adminId,
                assigned_at: new Date().toISOString(),
                status: 'investigating',
            })
            .eq('id', disputeId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao atribuir disputa:', error);
        throw error;
    }
}

// Enviar mensagem na disputa
export async function sendDisputeMessage(
    disputeId: string,
    senderId: string,
    message: string,
    isInternal: boolean = false
) {
    try {
        const { error } = await supabase.from('dispute_messages').insert({
            dispute_id: disputeId,
            sender_id: senderId,
            message,
            is_internal: isInternal,
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        throw error;
    }
}

// Resolver disputa
export async function resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: string,
    resolutionType: string,
    refundAmount?: number,
    transferAmount?: number
) {
    try {
        const { error } = await supabase.rpc('resolve_dispute', {
            p_dispute_id: disputeId,
            p_admin_id: adminId,
            p_resolution: resolution,
            p_resolution_type: resolutionType,
            p_refund_amount: refundAmount,
            p_transfer_amount: transferAmount,
        });

        if (error) throw error;

        // TODO: Integrar com Stripe para processar reembolsos/transferências

        return { success: true };
    } catch (error) {
        console.error('Erro ao resolver disputa:', error);
        throw error;
    }
}

// Atualizar prioridade
export async function updateDisputePriority(disputeId: string, priority: DisputePriority) {
    try {
        const { error } = await supabase
            .from('disputes')
            .update({ priority })
            .eq('id', disputeId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar prioridade:', error);
        throw error;
    }
}
