import { supabase } from '@/lib/supabase';
import { ProjectData } from '@/lib/projects';
import { BatchVideoCreate } from '@/types';

interface BatchProjectData extends ProjectData {
    is_batch: boolean;
    batch_quantity: number;
    batch_delivery_mode: 'sequential' | 'simultaneous';
    batch_discount_percent: number;
    // Enhanced Briefing
    raw_footage_url: string;
    raw_footage_duration: string;
    brand_identity_url: string;
    fonts_url: string;
    music_sfx_url?: string;
}

export async function createBatchProject(
    projectData: BatchProjectData,
    batchVideos: BatchVideoCreate[],
    creatorId: string
) {
    try {
        // 1. Criar o projeto principal
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
                creator_id: creatorId,
                pricing_id: projectData.pricing_id,

                // Informações básicas
                title: projectData.title,
                description: projectData.description,
                video_type: projectData.video_type,
                editing_style: projectData.editing_style,
                duration_category: projectData.duration_category,

                // Material e Referências (Briefing Aprimorado)
                reference_files_url: projectData.reference_files_url || projectData.raw_footage_url, // Fallback/Compatibilidade
                context_description: projectData.context_description || null,
                reference_links: projectData.reference_links || null,

                // Novos campos de briefing
                raw_footage_url: projectData.raw_footage_url,
                raw_footage_duration: projectData.raw_footage_duration,
                brand_identity_url: projectData.brand_identity_url,
                fonts_url: projectData.fonts_url,
                music_sfx_url: projectData.music_sfx_url || null,

                // Dados de Lote
                is_batch: true,
                batch_quantity: projectData.batch_quantity,
                batch_delivery_mode: projectData.batch_delivery_mode,
                batch_discount_percent: projectData.batch_discount_percent,

                // Valores e Pagamento
                base_price: projectData.base_price,
                platform_fee: projectData.platform_fee,
                total_paid_by_creator: projectData.total_paid_by_creator,
                total_price: projectData.total_paid_by_creator, // Legado

                // Editor Earnings (será liberado por vídeo)
                editor_earnings_per_video: (projectData.base_price * (1 - (projectData.batch_discount_percent / 100))),
                editor_earnings_released: 0,
                videos_approved: 0,

                // Configurações
                max_applications: 5,
                current_applications: 0,
                max_revisions: 3,
                current_revisions: 0,

                // Prazo (calculado no front, mas salvo aqui)
                estimated_delivery_days: projectData.estimated_delivery_days,
                deadline_days: projectData.estimated_delivery_days,

                // Status inicial
                status: 'draft',
                payment_status: 'pending'
            })
            .select()
            .single();

        if (projectError) throw projectError;
        if (!project) throw new Error('Erro ao criar projeto');

        // 2. Inserir os vídeos do lote na tabela `batch_videos`
        const videosToInsert = batchVideos.map(video => ({
            project_id: project.id,
            sequence_order: video.sequence_order,
            title: video.title || `Vídeo ${video.sequence_order}`,
            status: 'pending', // Inicialmente pendente
            specific_instructions: video.specific_instructions || null,
            editor_can_choose_timing: video.editor_can_choose_timing,
            // duration_start/end seriam opcionais se o usuário preenchesse, mas no MVP talvez não
        }));

        const { error: videosError } = await supabase
            .from('batch_videos')
            .insert(videosToInsert);

        if (videosError) {
            // Se falhar nos vídeos, idealmente faríamos rollback (delete project), 
            // mas por simplicidade no MVP apenas lançamos erro.
            console.error('Erro ao salvar vídeos do lote:', videosError);
            throw videosError;
        }

        return { success: true, project };

    } catch (error: any) {
        console.error('Erro ao criar projeto em lote:', error);
        return {
            success: false,
            error: error.message || 'Erro ao processar criação do lote'
        };
    }
}
