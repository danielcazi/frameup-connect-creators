import { supabase } from '@/lib/supabase';
import { EditorApprovalQueue, EditorApprovalDetails } from '@/types/admin';

// Buscar fila de aprovações pendentes
export async function getApprovalQueue(
    status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending'
) {
    try {
        let query = supabase
            .from('editor_approval_queue')
            .select(`
        *,
        editor:users!editor_id (
          id,
          email,
          full_name
        )
      `)
            .order('submitted_at', { ascending: true });

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data as EditorApprovalQueue[];
    } catch (error) {
        console.error('Erro ao buscar fila de aprovação:', error);
        throw error;
    }
}

// Buscar detalhes completos de um editor na fila
export async function getEditorApprovalDetails(
    editorId: string
): Promise<EditorApprovalDetails | null> {
    try {
        // Buscar dados da fila
        const { data: queueData, error: queueError } = await supabase
            .from('editor_approval_queue')
            .select('*')
            .eq('editor_id', editorId)
            .single();

        if (queueError) throw queueError;

        // Buscar dados do usuário
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('user_id', editorId)
            .single();

        if (userError) throw userError;

        // Buscar dados do perfil
        const { data: profileData, error: profileError } = await supabase
            .from('editor_profiles')
            .select('*')
            .eq('user_id', editorId)
            .single();

        if (profileError) throw profileError;

        // Buscar portfólio
        const { data: portfolioData, error: portfolioError } = await supabase
            .from('portfolio_videos')
            .select('*')
            .eq('editor_id', editorId)
            .order('order_position');

        if (portfolioError) throw portfolioError;

        // Montar objeto completo
        return {
            ...queueData,
            editor: {
                id: editorId,
                name: userData.full_name || 'Sem nome',
                email: userData.email,
                bio: profileData.bio || '',
                city: profileData.city || '',
                state: profileData.state || '',
                software_skills: profileData.software_skills || [],
                specialties: profileData.specialties || [],
            },
            portfolio: portfolioData || [],
        };
    } catch (error) {
        console.error('Erro ao buscar detalhes do editor:', error);
        return null;
    }
}

// Aprovar editor
export async function approveEditor(
    editorId: string,
    adminId: string,
    portfolioScore: number,
    profileScore: number,
    notes: string
) {
    try {
        const { error } = await supabase.rpc('approve_editor', {
            p_editor_id: editorId,
            p_admin_id: adminId,
            p_portfolio_score: portfolioScore,
            p_profile_score: profileScore,
            p_notes: notes,
        });

        if (error) throw error;

        // TODO: Enviar email de boas-vindas
        // await sendWelcomeEmail(editorId);

        return { success: true };
    } catch (error) {
        console.error('Erro ao aprovar editor:', error);
        throw error;
    }
}

// Rejeitar editor
export async function rejectEditor(
    editorId: string,
    adminId: string,
    rejectionReason: string,
    portfolioScore: number,
    profileScore: number
) {
    try {
        const { error } = await supabase.rpc('reject_editor', {
            p_editor_id: editorId,
            p_admin_id: adminId,
            p_rejection_reason: rejectionReason,
            p_portfolio_score: portfolioScore,
            p_profile_score: profileScore,
        });

        if (error) throw error;

        // TODO: Enviar email de feedback
        // await sendRejectionEmail(editorId, rejectionReason);

        return { success: true };
    } catch (error) {
        console.error('Erro ao rejeitar editor:', error);
        throw error;
    }
}

// Verificações automáticas
export async function runAutoChecks(editorId: string) {
    try {
        const checks = {
            portfolio_valid: await verifyPortfolioLinks(editorId),
            has_duplicates: await checkDuplicatePortfolio(editorId),
            profile_complete: await calculateProfileCompleteness(editorId),
        };

        // Salvar flags
        await supabase
            .from('editor_approval_queue')
            .update({
                has_duplicate_portfolio: checks.has_duplicates,
                has_suspicious_links: !checks.portfolio_valid,
                auto_flags: checks,
            })
            .eq('editor_id', editorId);

        return checks;
    } catch (error) {
        console.error('Erro ao executar verificações automáticas:', error);
        return null;
    }
}

// Buscar estatísticas de aprovação
export async function getApprovalStats() {
    try {
        // Total pendente
        const { count: pendingCount } = await supabase
            .from('editor_approval_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // Aprovados hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: approvedToday } = await supabase
            .from('editor_approval_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .gte('reviewed_at', today.toISOString());

        // Rejeitados hoje
        const { count: rejectedToday } = await supabase
            .from('editor_approval_queue')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'rejected')
            .gte('reviewed_at', today.toISOString());

        return {
            total_pending: pendingCount || 0,
            total_approved_today: approvedToday || 0,
            total_rejected_today: rejectedToday || 0,
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            total_pending: 0,
            total_approved_today: 0,
            total_rejected_today: 0,
        };
    }
}

// Verificar se links do portfólio são válidos
async function verifyPortfolioLinks(editorId: string): Promise<boolean> {
    try {
        const { data: videos } = await supabase
            .from('portfolio_videos')
            .select('video_url')
            .eq('editor_id', editorId);

        if (!videos || videos.length === 0) return false;

        // Verificar se URLs são válidas (sem fazer requests externos)
        const validPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com'];
        return videos.every((v) =>
            validPlatforms.some((platform) => v.video_url.includes(platform))
        );
    } catch {
        return false;
    }
}

// Detectar portfólio duplicado
async function checkDuplicatePortfolio(editorId: string): Promise<boolean> {
    try {
        const { data: videos } = await supabase
            .from('portfolio_videos')
            .select('video_url')
            .eq('editor_id', editorId);

        if (!videos || videos.length === 0) return false;

        const urls = videos.map((v) => v.video_url);

        const { data: existingVideos } = await supabase
            .from('portfolio_videos')
            .select('video_url, editor_id')
            .in('video_url', urls)
            .neq('editor_id', editorId);

        return (existingVideos?.length || 0) > 0;
    } catch {
        return false;
    }
}

// Calcular completude do perfil
async function calculateProfileCompleteness(editorId: string): Promise<number> {
    try {
        const { data: profile } = await supabase
            .from('editor_profiles')
            .select('*')
            .eq('user_id', editorId)
            .single();

        if (!profile) return 0;

        const { data: videos } = await supabase
            .from('portfolio_videos')
            .select('id')
            .eq('editor_id', editorId);

        let score = 0;
        if (profile.bio && profile.bio.length > 50) score += 20;
        if (profile.city && profile.state) score += 20;
        if (profile.software_skills && profile.software_skills.length > 0) score += 20;
        if (profile.specialties && profile.specialties.length > 0) score += 20;
        if (videos && videos.length === 3) score += 20;

        return score;
    } catch {
        return 0;
    }
}
