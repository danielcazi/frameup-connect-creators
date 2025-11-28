import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Subscription {
    id: string;
    status: string;
    plan_id: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    subscription_plans: {
        name: string;
        display_name: string;
        max_simultaneous_projects: number;
        has_highlight_badge: boolean;
    };
}

export function useSubscription() {
    const { user, userType } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    const loadSubscription = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('editor_subscriptions')
                .select(`
          *,
          subscription_plans (*)
        `)
                .eq('editor_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            setSubscription(data);
        } catch (error) {
            console.error('Error loading subscription:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && userType === 'editor') {
            loadSubscription();
        } else {
            setLoading(false);
        }
    }, [user, userType, loadSubscription]);

    function hasActiveSubscription(): boolean {
        return subscription?.status === 'active';
    }

    function canAcceptMoreProjects(currentProjectsCount: number): boolean {
        if (!subscription) return false;
        return currentProjectsCount < subscription.subscription_plans.max_simultaneous_projects;
    }

    return {
        subscription,
        loading,
        hasActiveSubscription,
        canAcceptMoreProjects,
        refetch: loadSubscription,
    };
}
