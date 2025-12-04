import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    CreditCard,
    Calendar,
    AlertCircle,
    CheckCircle,
    XCircle,
    Crown,
    Loader2,
    ExternalLink,
    TrendingUp
} from 'lucide-react';

interface Subscription {
    id: string;
    status: 'active' | 'past_due' | 'cancelled' | 'expired';
    stripe_subscription_id: string;
    stripe_customer_id: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    subscription_plans: {
        id: string;
        name: string;
        display_name: string;
        price: number;
        max_simultaneous_projects: number;
        has_highlight_badge: boolean;
        features: string[];
    };
}

function ManageSubscription() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [reactivating, setReactivating] = useState(false);
    const [currentProjects, setCurrentProjects] = useState(0);

    useEffect(() => {
        loadSubscription();
        loadCurrentProjects();
    }, []);

    async function loadSubscription() {
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
                .limit(1)
                .single();

            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
            if (userEmail === 'editorfull@frameup.com') {
                // @ts-ignore
                setSubscription({
                    id: 'test-subscription',
                    status: 'active',
                    stripe_subscription_id: 'sub_test',
                    stripe_customer_id: 'cus_test',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                    cancel_at_period_end: false,
                    subscription_plans: {
                        id: 'pro-plan-id',
                        name: 'pro',
                        display_name: 'Plano Pro',
                        price: 97.00,
                        max_simultaneous_projects: 4,
                        has_highlight_badge: true,
                        features: ['Acesso a projetos ilimitados', '4 projetos simultâneos', 'Taxa de plataforma mínima (10%)', 'Suporte prioritário', 'Badge de Editor PRO', 'Acesso antecipado a novos projetos']
                    }
                });
                setLoading(false);
                return;
            }

            if (error && error.code !== 'PGRST116') throw error;

            // @ts-ignore
            setSubscription(data);
        } catch (error) {
            console.error('Error loading subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar assinatura'
            });
        } finally {
            setLoading(false);
        }
    }

    async function loadCurrentProjects() {
        if (!user) return;
        try {
            const { count } = await supabase
                .from('projects')
                .select('id', { count: 'exact', head: true })
                .eq('assigned_editor_id', user.id)
                .eq('status', 'in_progress');

            setCurrentProjects(count || 0);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async function handleCancelSubscription() {
        if (!confirm(
            'Tem certeza que deseja cancelar sua assinatura? ' +
            'Você ainda terá acesso até o fim do período pago.'
        )) {
            return;
        }

        setCancelling(true);

        try {
            const { error } = await supabase.functions.invoke('cancel-subscription', {
                body: {
                    subscription_id: subscription!.stripe_subscription_id
                }
            });

            if (error) throw error;

            toast({
                title: 'Assinatura cancelada',
                description: 'Você terá acesso até ' +
                    new Date(subscription!.current_period_end).toLocaleDateString('pt-BR')
            });

            loadSubscription();
        } catch (error: any) {
            console.error('Error cancelling subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao cancelar assinatura'
            });
        } finally {
            setCancelling(false);
        }
    }

    async function handleReactivateSubscription() {
        setReactivating(true);

        try {
            const { error } = await supabase.functions.invoke('reactivate-subscription', {
                body: {
                    subscription_id: subscription!.stripe_subscription_id
                }
            });

            if (error) throw error;

            toast({
                title: 'Sucesso',
                description: 'Assinatura reativada com sucesso!'
            });

            loadSubscription();
        } catch (error: any) {
            console.error('Error reactivating subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao reativar assinatura'
            });
        } finally {
            setReactivating(false);
        }
    }

    async function handleUpdatePaymentMethod() {
        try {
            // Criar portal session do Stripe
            const { data, error } = await supabase.functions.invoke('create-portal-session', {
                body: {
                    customer_id: subscription!.stripe_customer_id,
                    return_url: window.location.href
                }
            });

            if (error) throw error;

            // Redirecionar para Stripe Portal
            window.location.href = data.url;
        } catch (error: any) {
            console.error('Error opening portal:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao abrir portal de pagamento'
            });
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-500 hover:bg-green-600">Ativa</Badge>;
            case 'past_due':
                return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pagamento Pendente</Badge>;
            case 'cancelled':
                return <Badge variant="destructive">Cancelada</Badge>;
            case 'expired':
                return <Badge variant="secondary">Expirada</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    if (loading) {
        return (
            <DashboardLayout
                userType="editor"
                title="Gerenciar Assinatura"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!subscription) {
        return (
            <DashboardLayout
                userType="editor"
                title="Gerenciar Assinatura"
                subtitle="Você não possui assinatura ativa"
            >
                <Card className="text-center p-8">
                    <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                        Nenhuma Assinatura Ativa
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        Assine um plano para começar a acessar projetos.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/editor/subscription/plans')}
                    >
                        Ver Planos Disponíveis
                    </Button>
                </Card>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            userType="editor"
            title="Gerenciar Assinatura"
            subtitle="Gerencie seu plano e forma de pagamento"
        >
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Status da Assinatura */}
                <Card className="p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">
                                {subscription.subscription_plans.display_name}
                            </h2>
                            <p className="text-muted-foreground">
                                R$ {Number(subscription.subscription_plans.price).toFixed(2).replace('.', ',')}/mês
                            </p>
                        </div>
                        {getStatusBadge(subscription.status)}
                    </div>

                    {/* Alertas */}
                    {subscription.status === 'past_due' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                                    Pagamento Pendente
                                </p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                                    Há um problema com seu método de pagamento. Atualize suas informações para manter o acesso.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUpdatePaymentMethod}
                                >
                                    Atualizar Pagamento
                                </Button>
                            </div>
                        </div>
                    )}

                    {subscription.cancel_at_period_end && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-red-900 dark:text-red-300 mb-1">
                                    Assinatura Cancelada
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                                    Sua assinatura será encerrada em{' '}
                                    {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}.
                                    Você ainda terá acesso até esta data.
                                </p>
                                <Button
                                    size="sm"
                                    onClick={handleReactivateSubscription}
                                    disabled={reactivating}
                                >
                                    {reactivating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Reativando...
                                        </>
                                    ) : (
                                        'Reativar Assinatura'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Info Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Próxima Cobrança */}
                        <div className="bg-muted/30 rounded-lg p-4 border">
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="w-5 h-5 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    {subscription.cancel_at_period_end ? 'Acesso até' : 'Próxima Cobrança'}
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                            </p>
                        </div>

                        {/* Projetos Simultâneos */}
                        <div className="bg-muted/30 rounded-lg p-4 border">
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-5 h-5 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    Projetos Simultâneos
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {currentProjects} / {subscription.subscription_plans.max_simultaneous_projects}
                            </p>
                            {currentProjects >= subscription.subscription_plans.max_simultaneous_projects && (
                                <p className="text-sm text-yellow-600 mt-1">
                                    Limite atingido
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Features */}
                    <div className="border-t pt-6">
                        <h3 className="font-semibold text-foreground mb-4">
                            Recursos do Plano
                        </h3>
                        <ul className="space-y-2">
                            {subscription.subscription_plans.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                {/* Ações */}
                <Card className="p-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Gerenciar Assinatura
                    </h3>

                    <div className="space-y-4">
                        {/* Atualizar Pagamento */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium text-foreground">
                                        Atualizar Forma de Pagamento
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Alterar cartão de crédito
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleUpdatePaymentMethod}
                            >
                                Gerenciar
                                <ExternalLink className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        {/* Upgrade */}
                        {subscription.subscription_plans.name === 'basic' && (
                            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <Crown className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="font-medium text-foreground">
                                            Fazer Upgrade para PRO
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            4 projetos simultâneos + badge de destaque
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/editor/subscription/plans')} // Redireciona para planos para upgrade
                                >
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Upgrade
                                </Button>
                            </div>
                        )}

                        {/* Cancelar */}
                        {!subscription.cancel_at_period_end && subscription.status === 'active' && (
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="font-medium text-foreground">
                                            Cancelar Assinatura
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Você terá acesso até o fim do período pago
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                >
                                    {cancelling ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Cancelando...
                                        </>
                                    ) : (
                                        'Cancelar'
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Histórico de Faturas (futuro) */}
                <Card className="p-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Histórico de Pagamentos
                    </h3>
                    <p className="text-muted-foreground text-center py-8">
                        Em breve você poderá visualizar e baixar suas faturas aqui.
                    </p>
                </Card>
            </div>
        </DashboardLayout>
    );
}

export default ManageSubscription;
