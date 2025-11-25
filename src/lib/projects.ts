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
                editor_receives: projectData.base_price, // Assuming editor receives base price for now

                // Configurações
                max_applications: 5,
                current_applications: 0,
                max_revisions: 3,
                current_revisions: 0,
                estimated_delivery_days: projectData.estimated_delivery_days,

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
