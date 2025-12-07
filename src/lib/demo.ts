import { supabase } from '@/lib/supabase';

/**
 * Verifica se o usuário atual é um usuário demo
 * @param userId - ID do usuário (UUID)
 * @returns true se for usuário demo
 */
export async function isDemoUser(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('users')
        .select('is_demo')
        .eq('id', userId)
        .single();

    if (error || !data) return false;
    return data.is_demo === true;
}

/**
 * Publica um projeto usando a função RPC do Supabase
 * A função RPC tem SECURITY DEFINER e bypassa RLS
 * @param projectId - ID do projeto (UUID)
 * @returns true se publicou com sucesso
 */
export async function publishProjectAsDemo(projectId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('publish_demo_project', {
        p_project_id: projectId
    });

    if (error) {
        console.error('[Demo] Erro ao publicar projeto:', error.message);
        return false;
    }

    return data === true;
}
