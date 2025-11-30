import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export interface WorkedEditor {
    editor_id: string;
    editor_name: string;
    editor_photo: string | null;
    editor_rating: number;
    editor_specialties: string[] | null;
    projects_together: number;
    last_project_at: string;
    last_rating_given: number | null;
    has_pending_proposal: boolean;
}

export interface RehireProposal {
    project_id: string;
    project_title: string;
    project_description: string;
    video_type: string;
    editing_style: string;
    duration_category: string;
    base_price: number;
    deadline_days: number | null;
    creator_id: string;
    creator_name: string;
    creator_photo: string | null;
    rehire_message: string | null;
    sent_at: string;
    projects_with_creator: number;
}

export interface CreateRehireProjectData {
    editorId: string;
    title: string;
    description: string;
    videoType: 'reels' | 'motion' | 'youtube';
    editingStyle: 'lofi' | 'dynamic' | 'pro' | 'motion';
    durationCategory: '30s' | '1m' | '2m' | '5m';
    basePrice: number;
    platformFee: number;
    totalPrice: number;
    deadlineDays?: number;
    referenceFilesUrl?: string;
    contextDescription?: string;
    rehireMessage?: string;
}

// ================================================
// FUNÇÕES PRINCIPAIS
// ================================================

/**
 * Verificar se creator pode recontratar um editor
 */
export async function canRehireEditor(
    creatorId: string,
    editorId: string
): Promise<{ canRehire: boolean; reason?: string }> {
    try {
        const { data, error } = await supabase.rpc('can_rehire_editor', {
            p_creator_id: creatorId,
            p_editor_id: editorId,
        });

        if (error) throw error;

        const result = data?.[0];
        return {
            canRehire: result?.can_rehire ?? false,
            reason: result?.reason,
        };
    } catch (error: any) {
        console.error('Erro ao verificar recontratação:', error);
        return { canRehire: false, reason: error.message };
    }
}

/**
 * Buscar editores com quem o creator já trabalhou
 */
export async function getWorkedEditors(creatorId: string): Promise<WorkedEditor[]> {
    try {
        const { data, error } = await supabase.rpc('get_rehire_editors', {
            p_creator_id: creatorId,
        });

        if (error) throw error;
        return data || [];
    } catch (error: any) {
        console.error('Erro ao buscar editores:', error);
        throw new Error(error.message || 'Não foi possível carregar os editores');
    }
}

/**
 * Criar projeto de recontratação
 */
export async function createRehireProject(
    creatorId: string,
    projectData: CreateRehireProjectData
): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('create_rehire_project', {
            p_creator_id: creatorId,
            p_editor_id: projectData.editorId,
            p_title: projectData.title,
            p_description: projectData.description,
            p_video_type: projectData.videoType,
            p_editing_style: projectData.editingStyle,
            p_duration_category: projectData.durationCategory,
            p_base_price: projectData.basePrice,
            p_platform_fee: projectData.platformFee,
            p_total_price: projectData.totalPrice,
            p_deadline_days: projectData.deadlineDays || null,
            p_reference_files_url: projectData.referenceFilesUrl || null,
            p_context_description: projectData.contextDescription || null,
            p_rehire_message: projectData.rehireMessage || null,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao criar projeto:', error);
        throw new Error(error.message || 'Não foi possível criar o projeto');
    }
}

/**
 * Editor aceita proposta
 */
export async function acceptRehireProposal(
    projectId: string,
    editorId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('accept_rehire_proposal', {
            p_project_id: projectId,
            p_editor_id: editorId,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao aceitar proposta:', error);
        throw new Error(error.message || 'Não foi possível aceitar a proposta');
    }
}

/**
 * Editor recusa proposta
 */
export async function rejectRehireProposal(
    projectId: string,
    editorId: string,
    reason?: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('reject_rehire_proposal', {
            p_project_id: projectId,
            p_editor_id: editorId,
            p_reason: reason || null,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao recusar proposta:', error);
        throw new Error(error.message || 'Não foi possível recusar a proposta');
    }
}

/**
 * Buscar propostas pendentes do editor
 */
export async function getEditorProposals(editorId: string): Promise<RehireProposal[]> {
    try {
        const { data, error } = await supabase.rpc('get_editor_rehire_proposals', {
            p_editor_id: editorId,
        });

        if (error) throw error;
        return data || [];
    } catch (error: any) {
        console.error('Erro ao buscar propostas:', error);
        throw new Error(error.message || 'Não foi possível carregar as propostas');
    }
}

/**
 * Contar propostas pendentes
 */
export async function getPendingProposalsCount(editorId: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_pending_proposals_count', {
            p_editor_id: editorId,
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Erro ao contar propostas:', error);
        return 0;
    }
}

// ================================================
// HELPERS
// ================================================

export function formatProjectsCount(count: number): string {
    if (count === 1) return '1 projeto juntos';
    return `${count} projetos juntos`;
}

export function formatLastProjectDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
}
