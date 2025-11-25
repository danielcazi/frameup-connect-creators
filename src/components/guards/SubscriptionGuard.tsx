import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionData {
    id: string;
    status: 'active' | 'past_due' | 'cancelled' | 'expired';
    plan_id: string;
    cancel_at_period_end: boolean;
    current_period_end: string;
    subscription_plans: {
        name: string;
        display_name: string;
        max_simultaneous_projects: number;
    };
}

interface SubscriptionGuardProps {
    children: React.ReactNode;
    requireActive?: boolean; // Se true, requer assinatura ativa
}

function SubscriptionGuard({
    children,
    requireActive = true
}: SubscriptionGuardProps) {
    const { user, userType } = useAuth();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkSubscription();
    }, [user?.id]);

    async function checkSubscription() {
        if (!user || userType !== 'editor') {
            setLoading(false);
            return;
        }

        try {
            const { data, error: subError } = await supabase
                .from('user_subscriptions')
                .select(`
          *,
          subscription_plans (
            name,
            display_name,
            max_simultaneous_projects
          )
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (subError && subError.code !== 'PGRST116') {
                throw subError;
            }

            // @ts-ignore - Supabase types inference might be tricky with joins
            setSubscription(data);

            // Validar status se requireActive = true
            if (requireActive && data) {
                if (data.status !== 'active') {
                    // Não setamos erro aqui, deixamos os ifs abaixo tratarem
                }
            }
        } catch (err: any) {
            console.error('Error checking subscription:', err);
            setError('Erro ao verificar assinatura');
        } finally {
            setLoading(false);
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verificando assinatura...</p>
                </div>
            </div>
        );
    }

    // Não é editor ou não está logado
    if (!user || userType !== 'editor') {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    // Sem assinatura - redirecionar para planos
    if (!subscription) {
        return <Navigate to="/editor/subscription/plans" replace />;
    }

    // Assinatura expirada ou cancelada
    if (requireActive && subscription.status === 'expired') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Assinatura Expirada
                    </h2>

                    <p className="text-muted-foreground mb-6">
                        Sua assinatura expirou. Renove para continuar acessando projetos.
                    </p>

                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => window.location.href = '/editor/subscription/plans'}
                    >
                        Ver Planos
                    </Button>
                </div>
            </div>
        );
    }

    // Assinatura com pagamento atrasado
    if (requireActive && subscription.status === 'past_due') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-foreground mb-2">
                        Pagamento Pendente
                    </h2>

                    <p className="text-muted-foreground mb-6">
                        Há um problema com o pagamento da sua assinatura. Atualize seu método de pagamento.
                    </p>

                    <Button
                        size="lg"
                        className="w-full"
                        onClick={() => window.location.href = '/editor/subscription/manage'} // TODO: Criar página de manage
                    >
                        Gerenciar Assinatura
                    </Button>
                </div>
            </div>
        );
    }

    // Assinatura cancelada (mas ainda no período)
    if (subscription.status === 'cancelled' && subscription.cancel_at_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();

        // Se ainda está no período, permitir acesso
        if (endDate > now) {
            return <>{children}</>;
        } else {
            // Período acabou
            return <Navigate to="/editor/subscription/plans" replace />;
        }
    }

    // Erro ao verificar
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                    >
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        );
    }

    // Tudo OK - renderizar children
    return <>{children}</>;
}

export default SubscriptionGuard;
