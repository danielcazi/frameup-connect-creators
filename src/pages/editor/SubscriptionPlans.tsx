import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    max_simultaneous_projects: number;
    has_highlight_badge: boolean;
    features: string[];
    stripe_price_id: string;
}

function SubscriptionPlans() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        loadPlans();
        checkExistingSubscription();
    }, []);

    async function loadPlans() {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .order('price_monthly', { ascending: true });

            if (error) throw error;

            setPlans(data || []);
        } catch (error) {
            console.error('Error loading plans:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Erro ao carregar planos'
            });
        } finally {
            setLoading(false);
        }
    }

    async function checkExistingSubscription() {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('editor_subscriptions')
                .select('*, subscription_plans(*)')
                .eq('editor_id', user.id)
                .eq('status', 'active')
                .eq('status', 'active')
                .single();

            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
            if (data || userEmail === 'editorfull@frameup.com') {
                toast({
                    title: 'Assinatura ativa',
                    description: 'Você já possui uma assinatura ativa'
                });
                // navigate('/editor/subscription/manage'); // Página de gerenciamento ainda não existe
            }
        } catch (error) {
            // Sem assinatura ativa - OK
        }
    }

    async function handleSubscribe(planName: string) {
        setSubscribing(true);
        setSelectedPlan(planName);

        try {
            const userEmail = (user?.email || user?.user_metadata?.email || '').toLowerCase().trim();
            if (userEmail === 'editorfull@frameup.com') {
                // Simulate success for bypassed user
                setTimeout(() => {
                    toast({
                        title: 'Sucesso',
                        description: 'Plano ativado com sucesso!'
                    });
                    setSubscribing(false);
                    navigate('/editor/subscription/manage');
                }, 1000);
                return;
            }

            // Chamar Edge Function para criar checkout
            const { data: session, error } = await supabase.functions.invoke(
                'create-subscription',
                {
                    body: { plan_name: planName }
                }
            );

            if (error) throw error;

            if (session?.url) {
                // Redirecionar para Stripe Checkout
                window.location.href = session.url;
            } else {
                throw new Error('URL de checkout não retornada');
            }

        } catch (error: any) {
            console.error('Error creating subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao processar assinatura'
            });
            setSubscribing(false);
            setSelectedPlan(null);
        }
    }

    if (loading) {
        return (
            <DashboardLayout
                userType="editor"
                title="Planos"
                subtitle="Carregando..."
            >
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const DEFAULT_FEATURES = {
        basic: [
            'Acesso a projetos ilimitados',
            '2 projetos simultâneos',
            'Taxa de plataforma reduzida (15%)',
            'Suporte por email'
        ],
        pro: [
            'Acesso a projetos ilimitados',
            '4 projetos simultâneos',
            'Taxa de plataforma mínima (10%)',
            'Suporte prioritário',
            'Badge de Editor PRO',
            'Acesso antecipado a novos projetos'
        ]
    };

    return (
        <DashboardLayout
            userType="editor"
            title="Escolha seu Plano"
            subtitle="Assine para acessar projetos e começar a trabalhar"
        >
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                        Planos Simples e Transparentes
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Escolha o plano ideal para o seu volume de trabalho
                    </p>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    {plans.map((plan) => {
                        const features = plan.features || DEFAULT_FEATURES[plan.name as keyof typeof DEFAULT_FEATURES] || [];

                        return (
                            <Card
                                key={plan.id}
                                className={`relative p-8 flex flex-col ${plan.name === 'pro'
                                    ? 'border-2 border-primary shadow-xl'
                                    : 'border border-border shadow-sm'
                                    }`}
                            >
                                {/* Badge PRO */}
                                {plan.has_highlight_badge && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                                            <Crown className="w-4 h-4" />
                                            Mais Popular
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    {/* Icon */}
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                                        {plan.name === 'basic' ? (
                                            <Zap className="w-8 h-8 text-primary" />
                                        ) : (
                                            <Crown className="w-8 h-8 text-primary" />
                                        )}
                                    </div>

                                    {/* Nome */}
                                    <h3 className="text-2xl font-bold text-foreground mb-2">
                                        {plan.display_name}
                                    </h3>

                                    {/* Preço */}
                                    <div className="flex items-baseline justify-center gap-1 mb-1">
                                        <span className="text-4xl font-bold text-foreground">
                                            R$ {Number(plan.price_monthly).toFixed(2).replace('.', ',')}
                                        </span>
                                        <span className="text-muted-foreground">/mês</span>
                                    </div>

                                    <p className="text-sm text-muted-foreground">
                                        Até {plan.max_simultaneous_projects} projetos simultâneos
                                    </p>
                                </div>

                                {/* Features */}
                                <ul className="space-y-3 mb-8 flex-1">
                                    {features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="text-foreground/80">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <Button
                                    variant={plan.name === 'pro' ? 'default' : 'outline'}
                                    size="lg"
                                    className="w-full"
                                    onClick={() => handleSubscribe(plan.name)}
                                    disabled={subscribing}
                                >
                                    {subscribing && selectedPlan === plan.name ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Processando...
                                        </>
                                    ) : (
                                        `Assinar ${plan.display_name}`
                                    )}
                                </Button>
                            </Card>
                        );
                    })}
                </div>

                {/* FAQ / Info */}
                <Card className="p-8 bg-muted/30 border-none">
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Informações sobre a assinatura
                    </h3>
                    <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Cancele a qualquer momento, sem multas</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Upgrade ou downgrade quando quiser</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Pagamento seguro via Stripe</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>Suporte dedicado para assinantes</span>
                        </li>
                    </ul>
                </Card>
            </div>
        </DashboardLayout>
    );
}

export default SubscriptionPlans;
