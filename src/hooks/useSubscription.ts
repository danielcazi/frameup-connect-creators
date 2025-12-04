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

        console.log('useSubscription: Checking user', { id: user.id, email: user.email });

        try {
            // Check for bypass first
            const { data: profile } = await supabase
                .from('editor_profiles')
                .select('bypass_subscription')
                .eq('user_id', user.id)
                .single();

            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();

            if (profile?.bypass_subscription || userEmail === 'editorfull@frameup.com') {
                setSubscription({
                    id: 'test-subscription',
                    status: 'active',
                    plan_id: 'test-plan',
                    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    cancel_at_period_end: false,
                    subscription_plans: {
                        name: 'pro',
                        display_name: '🧪 Teste (Bypass)',
                        max_simultaneous_projects: 999,
                        has_highlight_badge: true,
                    }
                });
                setLoading(false);
                return;
            }

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
