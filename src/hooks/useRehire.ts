import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    getWorkedEditors,
    getEditorProposals,
    getPendingProposalsCount,
    acceptRehireProposal,
    rejectRehireProposal,
    WorkedEditor,
    RehireProposal,
} from '@/services/rehireService';

// ================================================
// HOOK PARA EDITORES TRABALHADOS (CREATOR)
// ================================================

interface UseWorkedEditorsReturn {
    editors: WorkedEditor[];
    loading: boolean;
    error: string | null;
    hasWorkedWithEditors: boolean;
    refresh: () => Promise<void>;
}

export function useWorkedEditors(): UseWorkedEditorsReturn {
    const { user, userType } = useAuth();
    const [editors, setEditors] = useState<WorkedEditor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadEditors = useCallback(async () => {
        if (!user || userType !== 'creator') {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const data = await getWorkedEditors(user.id);
            setEditors(data);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar editores');
        } finally {
            setLoading(false);
        }
    }, [user, userType]);

    useEffect(() => {
        loadEditors();
    }, [loadEditors]);

    return {
        editors,
        loading,
        error,
        hasWorkedWithEditors: editors.length > 0,
        refresh: loadEditors,
    };
}

// ================================================
// HOOK PARA PROPOSTAS RECEBIDAS (EDITOR)
// ================================================

interface UseRehireProposalsReturn {
    proposals: RehireProposal[];
    pendingCount: number;
    loading: boolean;
    error: string | null;
    accept: (projectId: string) => Promise<void>;
    reject: (projectId: string, reason?: string) => Promise<void>;
    refresh: () => Promise<void>;
}

export function useRehireProposals(): UseRehireProposalsReturn {
    const { user, userType } = useAuth();
    const [proposals, setProposals] = useState<RehireProposal[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProposals = useCallback(async () => {
        if (!user || userType !== 'editor') {
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const [proposalsData, count] = await Promise.all([
                getEditorProposals(user.id),
                getPendingProposalsCount(user.id),
            ]);

            setProposals(proposalsData);
            setPendingCount(count);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar propostas');
        } finally {
            setLoading(false);
        }
    }, [user, userType]);

    const accept = useCallback(async (projectId: string) => {
        if (!user) throw new Error('Usuário não autenticado');

        await acceptRehireProposal(projectId, user.id);

        // Remover da lista local
        setProposals((prev) => prev.filter((p) => p.project_id !== projectId));
        setPendingCount((prev) => Math.max(0, prev - 1));
    }, [user]);

    const reject = useCallback(async (projectId: string, reason?: string) => {
        if (!user) throw new Error('Usuário não autenticado');

        await rejectRehireProposal(projectId, user.id, reason);

        // Remover da lista local
        setProposals((prev) => prev.filter((p) => p.project_id !== projectId));
        setPendingCount((prev) => Math.max(0, prev - 1));
    }, [user]);

    // Real-time subscription
    useEffect(() => {
        if (!user || userType !== 'editor') return;

        loadProposals();

        const subscription = supabase
            .channel(`rehire-proposals:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `rehire_editor_id=eq.${user.id}`,
                },
                () => {
                    loadProposals();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, userType, loadProposals]);

    return {
        proposals,
        pendingCount,
        loading,
        error,
        accept,
        reject,
        refresh: loadProposals,
    };
}

// ================================================
// HOOK PARA CONTADOR DE PROPOSTAS PENDENTES
// ================================================

export function usePendingProposalsCount(): number {
    const { user, userType } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!user || userType !== 'editor') return;

        const loadCount = async () => {
            const c = await getPendingProposalsCount(user.id);
            setCount(c);
        };

        loadCount();

        // Real-time
        const subscription = supabase
            .channel(`proposals-count:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'projects',
                    filter: `rehire_editor_id=eq.${user.id}`,
                },
                () => {
                    loadCount();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user, userType]);

    return count;
}
