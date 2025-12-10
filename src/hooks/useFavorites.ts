import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    getFavorites,
    getFavoriteEditorIds,
    toggleFavorite,
    updateFavoriteNote,
    FavoriteEditor,
    FavoriteFilters,
} from '@/services/favoritesService';

export type { FavoriteEditor };

interface UseFavoritesReturn {
    // Lista de favoritos
    favorites: FavoriteEditor[];
    favoriteIds: Set<string>;
    total: number;
    loading: boolean;
    error: string | null;

    // Ações
    toggle: (editorId: string) => Promise<boolean>;
    updateNote: (editorId: string, note: string) => Promise<void>;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;

    // Helpers
    isFavorite: (editorId: string) => boolean;
    hasMore: boolean;
}

const PAGE_SIZE = 20;

export function useFavorites(filters?: FavoriteFilters): UseFavoritesReturn {
    const { user, userType } = useAuth();

    const [favorites, setFavorites] = useState<FavoriteEditor[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    // Carregar IDs dos favoritos (para checagem rápida)
    const loadFavoriteIds = useCallback(async () => {
        if (!user || userType !== 'creator') return;

        try {
            const ids = await getFavoriteEditorIds(user.id);
            setFavoriteIds(new Set(ids));
        } catch (err) {
            console.error('Erro ao carregar IDs favoritos:', err);
        }
    }, [user, userType]);

    // Carregar lista completa de favoritos
    const loadFavorites = useCallback(async (reset = true) => {
        if (!user || userType !== 'creator') {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            if (reset) setLoading(true);

            const currentOffset = reset ? 0 : offset;
            const { favorites: data, total: totalCount } = await getFavorites(user.id, {
                ...filters,
                limit: PAGE_SIZE,
                offset: currentOffset,
            });

            if (reset) {
                setFavorites(data);
                setOffset(PAGE_SIZE);
            } else {
                setFavorites((prev) => [...prev, ...data]);
                setOffset((prev) => prev + PAGE_SIZE);
            }

            setTotal(totalCount);

            // Atualizar IDs
            const newIds = new Set(data.map((f) => f.editor_id));
            if (reset) {
                setFavoriteIds(newIds);
            } else {
                setFavoriteIds((prev) => new Set([...prev, ...newIds]));
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar favoritos');
        } finally {
            setLoading(false);
        }
    }, [user, userType, filters, offset]);

    // Toggle favorito
    const toggle = useCallback(async (editorId: string): Promise<boolean> => {
        if (!user) throw new Error('Usuário não autenticado');

        try {
            const { isFavorite } = await toggleFavorite(user.id, editorId);

            // Atualizar estado local
            setFavoriteIds((prev) => {
                const newSet = new Set(prev);
                if (isFavorite) {
                    newSet.add(editorId);
                } else {
                    newSet.delete(editorId);
                }
                return newSet;
            });

            // Atualizar lista se estiver carregada
            if (!isFavorite) {
                setFavorites((prev) => prev.filter((f) => f.editor_id !== editorId));
                setTotal((prev) => Math.max(0, prev - 1));
            }

            return isFavorite;
        } catch (err) {
            throw err;
        }
    }, [user]);

    // Atualizar nota
    const updateNote = useCallback(async (editorId: string, note: string) => {
        if (!user) throw new Error('Usuário não autenticado');

        await updateFavoriteNote(user.id, editorId, note);

        // Atualizar estado local
        setFavorites((prev) =>
            prev.map((f) =>
                f.editor_id === editorId ? { ...f, note } : f
            )
        );
    }, [user]);

    // Verificar se é favorito
    const isFavorite = useCallback((editorId: string): boolean => {
        return favoriteIds.has(editorId);
    }, [favoriteIds]);

    // Carregar mais
    const loadMore = useCallback(async () => {
        if (loading || favorites.length >= total) return;
        await loadFavorites(false);
    }, [loading, favorites.length, total, loadFavorites]);

    // Effect inicial
    useEffect(() => {
        loadFavoriteIds();
        loadFavorites(true);
    }, [user, userType, filters?.search]);

    return {
        favorites,
        favoriteIds,
        total,
        loading,
        error,
        toggle,
        updateNote,
        refresh: () => loadFavorites(true),
        loadMore,
        isFavorite,
        hasMore: favorites.length < total,
    };
}

// Hook simplificado para apenas verificar favoritos (usar em cards)
export function useFavoriteCheck() {
    const { user, userType } = useAuth();
    const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!user || userType !== 'creator') {
                setLoading(false);
                return;
            }

            try {
                const ids = await getFavoriteEditorIds(user.id);
                setFavoriteIds(new Set(ids));
            } catch (err) {
                console.error('Erro ao carregar favoritos:', err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [user, userType]);

    const toggle = useCallback(async (editorId: string): Promise<boolean> => {
        if (!user) throw new Error('Usuário não autenticado');

        const { isFavorite } = await toggleFavorite(user.id, editorId);

        setFavoriteIds((prev) => {
            const newSet = new Set(prev);
            if (isFavorite) {
                newSet.add(editorId);
            } else {
                newSet.delete(editorId);
            }
            return newSet;
        });

        return isFavorite;
    }, [user]);

    const isFavorite = useCallback((editorId: string): boolean => {
        return favoriteIds.has(editorId);
    }, [favoriteIds]);

    return {
        isFavorite,
        toggle,
        loading,
        isCreator: userType === 'creator',
    };
}
