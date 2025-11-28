import { supabase } from '@/lib/supabase';

// ================================================
// TIPOS
// ================================================

export interface FavoriteEditor {
    favorite_id: string;
    editor_id: string;
    editor_name: string;
    editor_email: string;
    editor_photo: string | null;
    editor_bio: string | null;
    editor_specialties: string[] | null;
    editor_rating: number;
    editor_total_projects: number;
    note: string | null;
    favorited_at: string;
}

export interface FavoriteFilters {
    search?: string;
    limit?: number;
    offset?: number;
}

// ================================================
// FUNÇÕES PRINCIPAIS
// ================================================

/**
 * Adicionar editor aos favoritos
 */
export async function addFavorite(
    creatorId: string,
    editorId: string,
    note?: string
): Promise<string> {
    try {
        const { data, error } = await supabase.rpc('add_favorite', {
            p_creator_id: creatorId,
            p_editor_id: editorId,
            p_note: note || null,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao adicionar favorito:', error);
        throw new Error(error.message || 'Não foi possível adicionar aos favoritos');
    }
}

/**
 * Remover editor dos favoritos
 */
export async function removeFavorite(
    creatorId: string,
    editorId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('remove_favorite', {
            p_creator_id: creatorId,
            p_editor_id: editorId,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Erro ao remover favorito:', error);
        throw new Error(error.message || 'Não foi possível remover dos favoritos');
    }
}

/**
 * Verificar se editor está nos favoritos
 */
export async function checkIsFavorite(
    creatorId: string,
    editorId: string
): Promise<boolean> {
    try {
        // Tentar RPC primeiro
        const { data, error } = await supabase.rpc('is_favorite', {
            p_creator_id: creatorId,
            p_editor_id: editorId,
        });

        if (error) {
            // Fallback: query direta
            const { data: direct, error: directError } = await supabase
                .from('creator_favorites')
                .select('id')
                .eq('creator_id', creatorId)
                .eq('editor_id', editorId)
                .single();

            if (directError && directError.code !== 'PGRST116') throw directError;
            return !!direct;
        }

        return data || false;
    } catch (error) {
        console.error('Erro ao verificar favorito:', error);
        return false;
    }
}

/**
 * Buscar favoritos do creator
 */
export async function getFavorites(
    creatorId: string,
    filters: FavoriteFilters = {}
): Promise<{ favorites: FavoriteEditor[]; total: number }> {
    try {
        const { search, limit = 20, offset = 0 } = filters;

        // Buscar favoritos via RPC
        const { data, error } = await supabase.rpc('get_creator_favorites', {
            p_creator_id: creatorId,
            p_search: search || null,
            p_limit: limit,
            p_offset: offset,
        });

        if (error) throw error;

        // Buscar total
        let countQuery = supabase
            .from('creator_favorites')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', creatorId);

        if (search) {
            // Para contar com busca, precisamos fazer join
            // Simplificando: retornamos o length do data
        }

        const { count } = await countQuery;

        return {
            favorites: data || [],
            total: count || data?.length || 0,
        };
    } catch (error: any) {
        console.error('Erro ao buscar favoritos:', error);
        throw new Error(error.message || 'Não foi possível carregar os favoritos');
    }
}

/**
 * Atualizar nota de um favorito
 */
export async function updateFavoriteNote(
    creatorId: string,
    editorId: string,
    note: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('creator_favorites')
            .update({ note, updated_at: new Date().toISOString() })
            .eq('creator_id', creatorId)
            .eq('editor_id', editorId);

        if (error) throw error;
    } catch (error: any) {
        console.error('Erro ao atualizar nota:', error);
        throw new Error(error.message || 'Não foi possível atualizar a nota');
    }
}

/**
 * Buscar contagem de favoritos de um editor
 */
export async function getEditorFavoriteCount(editorId: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_editor_favorite_count', {
            p_editor_id: editorId,
        });

        if (error) throw error;
        return data || 0;
    } catch (error) {
        console.error('Erro ao buscar contagem:', error);
        return 0;
    }
}

/**
 * Buscar IDs dos editores favoritos (para checagem rápida)
 */
export async function getFavoriteEditorIds(creatorId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('creator_favorites')
            .select('editor_id')
            .eq('creator_id', creatorId);

        if (error) throw error;
        return (data || []).map((f) => f.editor_id);
    } catch (error) {
        console.error('Erro ao buscar IDs favoritos:', error);
        return [];
    }
}

/**
 * Toggle favorito (adiciona se não existe, remove se existe)
 */
export async function toggleFavorite(
    creatorId: string,
    editorId: string
): Promise<{ isFavorite: boolean }> {
    try {
        const isFav = await checkIsFavorite(creatorId, editorId);

        if (isFav) {
            await removeFavorite(creatorId, editorId);
            return { isFavorite: false };
        } else {
            await addFavorite(creatorId, editorId);
            return { isFavorite: true };
        }
    } catch (error: any) {
        throw error;
    }
}
