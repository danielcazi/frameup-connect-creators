import { supabase } from '@/lib/supabase';

// =====================================================
// INTERFACES
// =====================================================
interface DeliverVideoParams {
    projectId: string;
    batchVideoId: string;
    videoUrl: string;
    deliveryNotes?: string;
}

interface ApproveVideoParams {
    projectId: string;
    batchVideoId: string;
    deliveryId: string;
    feedback?: string;
}

interface RequestRevisionParams {
    projectId: string;
    batchVideoId: string;
    deliveryId: string;
    revisionNotes: string;
}

interface DeliveryResult {
    success: boolean;
    delivery?: any;
    error?: string;
}

interface ApprovalResult {
    success: boolean;
    error?: string;
}

interface RevisionResult {
    success: boolean;
    needsPayment?: boolean;
    extraCost?: number;
    message?: string;
    error?: string;
}

// =====================================================
// ENTREGAR VÍDEO (EDITOR)
// =====================================================
export async function deliverBatchVideo({
    projectId,
    batchVideoId,
    videoUrl,
    deliveryNotes
}: DeliverVideoParams): Promise<DeliveryResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Buscar dados do batch_video e projeto
        const { data: batchVideo, error: batchError } = await supabase
            .from('batch_videos')
            .select(`
        *,
        project:projects(*)
      `)
            .eq('id', batchVideoId)
            .single();

        if (batchError || !batchVideo) {
            throw new Error('Vídeo não encontrado');
        }

        // Verificar se editor está atribuído ao projeto
        // @ts-ignore
        if (batchVideo.project.assigned_editor_id !== user.id) {
            throw new Error('Você não está atribuído a este projeto');
        }

        // Verificar se vídeo está em status válido para entrega
        if (!['in_progress', 'revision'].includes(batchVideo.status)) {
            throw new Error('Este vídeo não está disponível para entrega');
        }

        // 2. Determinar versão da entrega
        const { count: deliveryCount } = await supabase
            .from('project_deliveries')
            .select('*', { count: 'exact', head: true })
            .eq('batch_video_id', batchVideoId);

        const version = (deliveryCount || 0) + 1;

        // 3. Criar registro de entrega
        const { data: delivery, error: deliveryError } = await supabase
            .from('project_deliveries')
            .insert({
                project_id: projectId,
                batch_video_id: batchVideoId,
                video_url: videoUrl,
                notes: deliveryNotes || null,
                version: version,
                status: 'pending_review',
                delivered_by: user.id,
                delivered_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (deliveryError) {
            console.error('Erro ao criar delivery:', deliveryError);
            throw new Error('Erro ao registrar entrega');
        }

        // 4. Atualizar status do batch_video
        const { error: updateError } = await supabase
            .from('batch_videos')
            .update({
                status: 'delivered',
                delivery_id: delivery.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', batchVideoId);

        if (updateError) {
            console.error('Erro ao atualizar batch_video:', updateError);
            throw new Error('Erro ao atualizar status do vídeo');
        }

        // 5. Atualizar status do projeto se necessário
        await supabase
            .from('projects')
            .update({
                status: 'delivered',
                updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
            .in('status', ['in_progress']); // Só atualiza se estiver em progresso

        // 6. Criar notificação para o cliente
        // @ts-ignore
        await supabase.from('notifications').insert({
            // @ts-ignore
            user_id: batchVideo.project.creator_id,
            type: 'video_delivered',
            title: '📦 Vídeo entregue!',
            // @ts-ignore
            message: `Vídeo #${batchVideo.sequence_order} "${batchVideo.title || ''}" foi entregue. Revise agora!`,
            data: {
                project_id: projectId,
                batch_video_id: batchVideoId,
                delivery_id: delivery.id,
                // @ts-ignore
                video_title: batchVideo.title,
                // @ts-ignore
                sequence_order: batchVideo.sequence_order,
            },
            read: false,
            created_at: new Date().toISOString(),
        });

        return { success: true, delivery };

    } catch (error: any) {
        console.error('Erro ao entregar vídeo:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// APROVAR VÍDEO (CLIENTE) + LIBERAR PAGAMENTO
// =====================================================
export async function approveBatchVideo({
    projectId,
    batchVideoId,
    deliveryId,
    feedback
}: ApproveVideoParams): Promise<ApprovalResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Buscar dados do projeto
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (projectError || !project) {
            throw new Error('Projeto não encontrado');
        }

        // Verificar se é o criador do projeto
        if (project.creator_id !== user.id) {
            throw new Error('Você não é o criador deste projeto');
        }

        // 2. Buscar batch_video
        const { data: batchVideo, error: batchError } = await supabase
            .from('batch_videos')
            .select('*')
            .eq('id', batchVideoId)
            .single();

        if (batchError || !batchVideo) {
            throw new Error('Vídeo não encontrado');
        }

        // 3. Atualizar delivery para aprovado
        const { error: deliveryError } = await supabase
            .from('project_deliveries')
            .update({
                status: 'approved',
                feedback: feedback || null,
                approved_at: new Date().toISOString(),
                approved_by: user.id,
            })
            .eq('id', deliveryId);

        if (deliveryError) {
            throw new Error('Erro ao atualizar entrega');
        }

        // 4. Atualizar batch_video para aprovado
        const paymentAmount = project.editor_earnings_per_video || (project.base_price * 0.85);

        const { error: batchUpdateError } = await supabase
            .from('batch_videos')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                payment_released_at: new Date().toISOString(),
                payment_amount: paymentAmount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', batchVideoId);

        if (batchUpdateError) {
            throw new Error('Erro ao atualizar vídeo');
        }

        // 5. Atualizar contadores do projeto
        const newVideosApproved = (project.videos_approved || 0) + 1;
        const newEarningsReleased = (project.editor_earnings_released || 0) + paymentAmount;
        const allApproved = newVideosApproved >= (project.batch_quantity || 1);

        const { error: projectUpdateError } = await supabase
            .from('projects')
            .update({
                videos_approved: newVideosApproved,
                editor_earnings_released: newEarningsReleased,
                status: allApproved ? 'completed' : project.status,
                updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

        if (projectUpdateError) {
            console.error('Erro ao atualizar projeto:', projectUpdateError);
        }

        // 6. MODO SEQUENCIAL: Ativar próximo vídeo automaticamente
        if (project.batch_delivery_mode === 'sequential' && !allApproved) {
            const nextSequence = batchVideo.sequence_order + 1;

            const { data: nextVideo } = await supabase
                .from('batch_videos')
                .select('id')
                .eq('project_id', projectId)
                .eq('sequence_order', nextSequence)
                .eq('status', 'pending')
                .single();

            if (nextVideo) {
                await supabase
                    .from('batch_videos')
                    .update({
                        status: 'in_progress',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', nextVideo.id);
            }
        }

        // 7. Liberar pagamento ao editor (via função do banco)
        const { error: paymentError } = await supabase.rpc('add_payment_to_wallet', {
            p_user_id: project.assigned_editor_id,
            p_amount: paymentAmount,
            p_project_id: projectId,
            p_batch_video_id: batchVideoId,
            p_description: `Vídeo #${batchVideo.sequence_order} aprovado - ${project.title}`,
        });

        if (paymentError) {
            console.error('Erro ao liberar pagamento:', paymentError);
            // Não falhar a aprovação por erro no pagamento
        }

        // 8. Notificar editor
        await supabase.from('notifications').insert({
            user_id: project.assigned_editor_id,
            type: 'video_approved',
            title: '✅ Vídeo aprovado!',
            message: `Vídeo #${batchVideo.sequence_order} foi aprovado! R$ ${paymentAmount.toFixed(2)} liberado para sua carteira.`,
            data: {
                project_id: projectId,
                batch_video_id: batchVideoId,
                amount: paymentAmount,
                video_title: batchVideo.title,
            },
            read: false,
            created_at: new Date().toISOString(),
        });

        // 9. Se todos aprovados, notificar conclusão
        if (allApproved) {
            await supabase.from('notifications').insert({
                user_id: project.assigned_editor_id,
                type: 'project_completed',
                title: '🎉 Projeto concluído!',
                message: `Todos os ${project.batch_quantity} vídeos foram aprovados! Total recebido: R$ ${newEarningsReleased.toFixed(2)}`,
                data: {
                    project_id: projectId,
                    total_earned: newEarningsReleased,
                },
                read: false,
                created_at: new Date().toISOString(),
            });
        }

        return { success: true };

    } catch (error: any) {
        console.error('Erro ao aprovar vídeo:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// SOLICITAR REVISÃO (CLIENTE)
// =====================================================
export async function requestBatchVideoRevision({
    projectId,
    batchVideoId,
    deliveryId,
    revisionNotes
}: RequestRevisionParams): Promise<RevisionResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Buscar dados
        const { data: batchVideo, error: batchError } = await supabase
            .from('batch_videos')
            .select(`
        *,
        project:projects(*)
      `)
            .eq('id', batchVideoId)
            .single();

        if (batchError || !batchVideo) {
            throw new Error('Vídeo não encontrado');
        }

        // Verificar se é o criador
        // @ts-ignore
        if (batchVideo.project.creator_id !== user.id) {
            throw new Error('Você não é o criador deste projeto');
        }

        const newRevisionCount = (batchVideo.revision_count || 0) + 1;
        const FREE_REVISIONS_LIMIT = 2;
        const needsPayment = newRevisionCount > FREE_REVISIONS_LIMIT && !batchVideo.paid_extra_revisions;

        // 2. Se precisa pagar, retornar aviso
        if (needsPayment) {
            // @ts-ignore
            const extraCost = (batchVideo.project.editor_earnings_per_video || batchVideo.project.base_price * 0.85) * 0.2;
            return {
                success: false,
                needsPayment: true,
                extraCost,
                message: `Você usou suas ${FREE_REVISIONS_LIMIT} revisões gratuitas. Para solicitar mais revisões, pague R$ ${extraCost.toFixed(2)} (+20% do valor do vídeo).`
            };
        }

        // 3. Atualizar delivery
        const { error: deliveryError } = await supabase
            .from('project_deliveries')
            .update({
                status: 'revision_requested',
                revision_notes: revisionNotes,
                revision_requested_at: new Date().toISOString(),
                revision_requested_by: user.id,
            })
            .eq('id', deliveryId);

        if (deliveryError) {
            throw new Error('Erro ao registrar solicitação');
        }

        // 4. Atualizar batch_video
        const { error: batchUpdateError } = await supabase
            .from('batch_videos')
            .update({
                status: 'revision',
                revision_count: newRevisionCount,
                updated_at: new Date().toISOString(),
            })
            .eq('id', batchVideoId);

        if (batchUpdateError) {
            throw new Error('Erro ao atualizar vídeo');
        }

        // 5. Atualizar status do projeto
        await supabase
            .from('projects')
            .update({
                status: 'revision',
                updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

        // 6. Notificar editor
        // @ts-ignore
        await supabase.from('notifications').insert({
            // @ts-ignore
            user_id: batchVideo.project.assigned_editor_id,
            type: 'revision_requested',
            title: '🔄 Revisão solicitada',
            // @ts-ignore
            message: `Cliente solicitou ajustes no vídeo #${batchVideo.sequence_order}. Revisão ${newRevisionCount}/${FREE_REVISIONS_LIMIT} grátis.`,
            data: {
                project_id: projectId,
                batch_video_id: batchVideoId,
                delivery_id: deliveryId,
                revision_notes: revisionNotes,
                revision_number: newRevisionCount,
            },
            read: false,
            created_at: new Date().toISOString(),
        });

        return { success: true };

    } catch (error: any) {
        console.error('Erro ao solicitar revisão:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// PAGAR POR REVISÕES EXTRAS
// =====================================================
export async function payForExtraRevisions({
    projectId,
    batchVideoId
}: {
    projectId: string;
    batchVideoId: string;
}): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Buscar dados do projeto
        const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();

        if (!project) throw new Error('Projeto não encontrado');

        // Verificar se é o criador
        if (project.creator_id !== user.id) {
            throw new Error('Você não é o criador deste projeto');
        }

        // 2. Calcular custo
        const editorEarnings = project.editor_earnings_per_video || (project.base_price * 0.85);
        const extraCost = editorEarnings * 0.2; // 20% do valor do vídeo
        const platformFee = extraCost * 0.15; // 15% taxa
        const totalCharge = extraCost + platformFee;

        // TODO: Implementar checkout Stripe
        // const session = await stripe.checkout.sessions.create({...});
        // return { success: true, checkoutUrl: session.url };

        // TEMPORÁRIO: Marcar como pago (modo dev/demo)
        const { error } = await supabase
            .from('batch_videos')
            .update({
                paid_extra_revisions: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', batchVideoId);

        if (error) throw error;

        return { success: true };

    } catch (error: any) {
        console.error('Erro ao processar pagamento:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// BUSCAR ENTREGAS DE UM VÍDEO
// =====================================================
export async function getVideoDeliveries(batchVideoId: string) {
    const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('batch_video_id', batchVideoId)
        .order('version', { ascending: false });

    if (error) {
        console.error('Erro ao buscar entregas:', error);
        return [];
    }

    return data || [];
}

// =====================================================
// BUSCAR ÚLTIMA ENTREGA DE UM VÍDEO
// =====================================================
export async function getLatestDelivery(batchVideoId: string) {
    const { data, error } = await supabase
        .from('project_deliveries')
        .select('*')
        .eq('batch_video_id', batchVideoId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignorar "not found"
        console.error('Erro ao buscar entrega:', error);
        return null;
    }

    return data;
}
