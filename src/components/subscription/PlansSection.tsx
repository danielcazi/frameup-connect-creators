import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
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

interface PlansSectionProps {
    currentPlanName?: string;
    onSubscribeSuccess?: () => void;
}

export function PlansSection({ currentPlanName, onSubscribeSuccess }: PlansSectionProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
        loadPlans();
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
                    if (onSubscribeSuccess) {
                        onSubscribeSuccess();
                    } else {
                        navigate('/editor/subscription/manage');
                    }
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
            <div className="flex items-center justify-center min-h-[200px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {plans.map((plan) => {
                const features = plan.features || DEFAULT_FEATURES[plan.name as keyof typeof DEFAULT_FEATURES] || [];
                const isCurrentPlan = currentPlanName === plan.name;

                return (
                    <Card
                        key={plan.id}
                        className={`relative p-8 flex flex-col ${plan.name === 'pro'
                            ? 'border-2 border-primary shadow-xl'
                            : 'border border-border shadow-sm'
                            } ${isCurrentPlan ? 'bg-primary/5' : ''}`}
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

                        {isCurrentPlan && (
                            <div className="absolute top-4 right-4">
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
                                    ATUAL
                                </span>
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
                            disabled={subscribing || isCurrentPlan}
                        >
                            {subscribing && selectedPlan === plan.name ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Processando...
                                </>
                            ) : isCurrentPlan ? (
                                'Plano Atual'
                            ) : (
                                `Assinar ${plan.display_name}`
                            )}
                        </Button>
                    </Card>
                );
            })}
        </div>
    );
}
