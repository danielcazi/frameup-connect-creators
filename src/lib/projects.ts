import { supabase } from './supabase';

export interface ProjectData {
    video_type: string | null;
    editing_style: string | null;
    duration_category: string | null;
    title: string;
    description: string;
    reference_files_url: string;
    context_description: string;
    reference_links: string;
    pricing_id: string | null;
    base_price: number;
    platform_fee: number;
    total_paid_by_creator: number;
    estimated_delivery_days: number;
}

export async function saveProjectDraft(projectData: ProjectData, creatorId: string) {
    try {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                creator_id: creatorId,
                pricing_id: projectData.pricing_id,

                // Informações do projeto
                title: projectData.title,
                description: projectData.description,
                video_type: projectData.video_type,
                editing_style: projectData.editing_style,
                duration_category: projectData.duration_category,

                // Materiais e referências
                reference_files_url: projectData.reference_files_url,
                context_description: projectData.context_description || null,
                reference_links: projectData.reference_links || null,

                // Valores
                base_price: projectData.base_price,
                platform_fee_percentage: 5,
                platform_fee: projectData.platform_fee,
                total_paid_by_creator: projectData.total_paid_by_creator,
                total_price: projectData.total_paid_by_creator, // Map to legacy total_price column
                editor_receives: projectData.base_price, // Assuming editor receives base price for now

                // Configurações
                max_applications: 5,
                current_applications: 0,
                max_revisions: 3,
                current_revisions: 0,
                estimated_delivery_days: projectData.estimated_delivery_days,
                deadline_days: projectData.estimated_delivery_days, // Map to legacy deadline_days column

                // Status
                status: 'draft',
                payment_status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, project: data };
    } catch (error: any) {
        console.error('Erro ao salvar projeto:', error);
        return {
            success: false,
            error: error.message || 'Erro ao salvar projeto'
        };
    }
}

export async function updateProject(id: string, projectData: ProjectData) {
    try {
        const { data, error } = await supabase
            .from('projects')
            .update({
                // Informações do projeto
                title: projectData.title,
                description: projectData.description,
                video_type: projectData.video_type,
                editing_style: projectData.editing_style,
                duration_category: projectData.duration_category,

                // Materiais e referências
                reference_files_url: projectData.reference_files_url,
                context_description: projectData.context_description || null,
                reference_links: projectData.reference_links || null,

                // Valores
                base_price: projectData.base_price,
                platform_fee: projectData.platform_fee,
                total_paid_by_creator: projectData.total_paid_by_creator,
                total_price: projectData.total_paid_by_creator,
                editor_receives: projectData.base_price,

                // Configurações
                estimated_delivery_days: projectData.estimated_delivery_days,
                deadline_days: projectData.estimated_delivery_days,

                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return { success: true, project: data };
    } catch (error: any) {
        console.error('Erro ao atualizar projeto:', error);
        return {
            success: false,
            error: error.message || 'Erro ao atualizar projeto'
        };
    }
}

export const canEditProject = (project: {
    status: string;
    assigned_editor_id?: string | null;
}): boolean => {
    // Só pode editar se:
    // 1. Não tem editor atribuído
    // 2. Status é draft, published ou open
    const editableStatuses = ['draft', 'published', 'open'];
    const hasNoEditor = !project.assigned_editor_id;
    const isEditableStatus = editableStatuses.includes(project.status);

    return hasNoEditor && isEditableStatus;
};

export const getProjectStatusLabel = (project: { status: string; assigned_editor_id?: string | null }) => {
    if (project.status === 'draft') return 'Rascunho';
    // Se status é published E não tem editor, é "Aberto" para candidaturas
    if (project.status === 'published' && !project.assigned_editor_id) return 'Aberto';
    // Se status é published E tem editor, ou já é in_progress, mostramos "Em Andamento"
    if ((project.status === 'published' && project.assigned_editor_id) || project.status === 'in_progress') return 'Em Andamento';
    if (project.status === 'in_review') return 'Em Revisão';
    if (project.status === 'completed') return 'Concluído';
    if (project.status === 'cancelled') return 'Cancelado';

    // Fallback: traduzir ou retornar o status original
    const statusMap: Record<string, string> = {
        'open': 'Aberto',
        'pending_payment': 'Pagamento Pendente'
    };
    return statusMap[project.status] || project.status;
};

export const getProjectStatusVariant = (project: { status: string; assigned_editor_id?: string | null }): "default" | "secondary" | "destructive" | "outline" => {
    if (project.status === 'draft') return 'secondary';
    if (project.status === 'published' && !project.assigned_editor_id) return 'secondary'; // Amarelo customizado geralmente
    if (project.status === 'open') return 'secondary'; // Amarelo customizado geralmente
    if (project.status === 'completed') return 'default'; // Verde customizado geralmente
    if (project.status === 'cancelled') return 'destructive';
    if (project.status === 'in_progress' || (project.status === 'published' && project.assigned_editor_id)) return 'default';

    return 'default';
};
