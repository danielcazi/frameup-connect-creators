import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    NotificationPreferences,
    getNotificationPreferences,
    updateNotificationPreferences,
} from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface UseNotificationPreferencesReturn {
    preferences: NotificationPreferences | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    updatePreference: (key: keyof NotificationPreferences, value: any) => void;
    updateMultiplePreferences: (updates: Partial<NotificationPreferences>) => void;
    savePreferences: () => Promise<boolean>;
    resetToDefaults: () => void;
    hasChanges: boolean;
}

const DEFAULT_PREFERENCES: Partial<NotificationPreferences> = {
    application_accepted: true,
    application_rejected: true,
    new_message: true,
    project_assigned: true,
    delivery_feedback: true,
    payment_received: true,
    new_favorite: true,
    new_projects_digest: false,
    channel_in_app: true,
    channel_email: true,
    channel_push: false,
    email_frequency: 'immediate',
    digest_hour: 9,
};

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
    const { user } = useAuth();
    const { toast } = useToast();

    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar preferências
    const loadPreferences = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const data = await getNotificationPreferences();

            if (data) {
                setPreferences(data);
                setOriginalPreferences(data);
            } else {
                // Se não existir, usar defaults
                const defaults = {
                    ...DEFAULT_PREFERENCES,
                    user_id: user.id,
                } as NotificationPreferences;
                setPreferences(defaults);
                setOriginalPreferences(defaults);
            }
        } catch (err) {
            setError('Erro ao carregar preferências');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Atualizar uma preferência localmente
    const updatePreference = useCallback((key: keyof NotificationPreferences, value: any) => {
        setPreferences((prev) => {
            if (!prev) return prev;
            return { ...prev, [key]: value };
        });
    }, []);

    // Atualizar múltiplas preferências localmente
    const updateMultiplePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
        setPreferences((prev) => {
            if (!prev) return prev;
            return { ...prev, ...updates };
        });
    }, []);

    // Salvar preferências no servidor
    const savePreferences = useCallback(async (): Promise<boolean> => {
        if (!preferences) return false;

        try {
            setSaving(true);
            setError(null);

            await updateNotificationPreferences(preferences);
            setOriginalPreferences(preferences);

            toast({
                title: 'Preferências salvas',
                description: 'Suas preferências de notificação foram atualizadas.',
            });

            return true;
        } catch (err) {
            setError('Erro ao salvar preferências');
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as preferências. Tente novamente.',
            });
            console.error(err);
            return false;
        } finally {
            setSaving(false);
        }
    }, [preferences, toast]);

    // Resetar para valores padrão
    const resetToDefaults = useCallback(() => {
        if (!user) return;

        const defaults = {
            ...DEFAULT_PREFERENCES,
            user_id: user.id,
            id: preferences?.id,
        } as NotificationPreferences;

        setPreferences(defaults);
    }, [user, preferences?.id]);

    // Verificar se há mudanças
    const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

    // Carregar ao montar
    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    return {
        preferences,
        loading,
        saving,
        error,
        updatePreference,
        updateMultiplePreferences,
        savePreferences,
        resetToDefaults,
        hasChanges,
    };
}
