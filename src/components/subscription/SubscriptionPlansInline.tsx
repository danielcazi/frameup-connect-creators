import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Award, Loader2 } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    max_simultaneous_projects: number;
    platform_fee_percentage: number;
    has_highlight_badge: boolean;
    has_priority_support: boolean;
    features: string[] | null;
    is_active: boolean;
    stripe_price_id: string;
}

interface SubscriptionPlansInlineProps {
    onSubscribeSuccess?: () => void;
    showTitle?: boolean;
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

function SubscriptionPlansInline({
    onSubscribeSuccess,
    showTitle = true
}: SubscriptionPlansInlineProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

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
        if (!user) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Você precisa estar logado'
            });
            return;
        }

        setSubscribing(true);
        setSelectedPlan(planName);

        try {
            const { data: session, error } = await supabase.functions.invoke(
                'create-subscription',
                {
                    body: { plan_name: planName }
                }
            );

            if (error) throw error;

            if (session?.url) {
                window.location.href = session.url;
            } else {
                throw new Error('URL de checkout não retornada');
            }
        } catch (error: any) {
            console.error('Error creating subscription:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao processar assinatura. Tente novamente.'
            });
            setSubscribing(false);
            setSelectedPlan(null);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {showTitle && (
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                        Planos Simples e Transparentes
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Escolha o plano ideal para o seu volume de trabalho
                    </p>
                </div>
            )}

            {/* Grid de Planos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {plans.map((plan) => {
                    const features = plan.features || DEFAULT_FEATURES[plan.name as keyof typeof DEFAULT_FEATURES] || [];
                    const isPro = plan.name === 'pro';
                    const isLoading = subscribing && selectedPlan === plan.name;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative p-8 flex flex-col ${isPro
                                ? 'border-2 border-primary shadow-lg shadow-primary/10'
                                : 'border border-border'
                                }`}
                        >
                            {/* Badge Popular */}
                            {isPro && (
                                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                                    <Award className="w-3 h-3 mr-1" />
                                    Mais Popular
                                </Badge>
                            )}

                            {/* Ícone */}
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-6 ${isPro ? 'bg-primary/10' : 'bg-muted'
                                }`}>
                                {isPro ? (
                                    <Award className="w-6 h-6 text-primary" />
                                ) : (
                                    <Zap className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>

                            {/* Nome e Preço */}
                            <h3 className="text-xl font-bold text-foreground mb-2">
                                {plan.display_name}
                            </h3>
                            <div className="mb-2">
                                <span className="text-4xl font-bold text-foreground">
                                    R$ {Number(plan.price_monthly).toFixed(2).replace('.', ',')}
                                </span>
                                <span className="text-muted-foreground">/mês</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-6">
                                Até {plan.max_simultaneous_projects} projetos simultâneos
                            </p>

                            {/* Features */}
                            <ul className="space-y-3 mb-8 flex-grow">
                                {features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPro ? 'text-primary' : 'text-green-500'
                                            }`} />
                                        <span className="text-sm text-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Botão */}
                            <Button
                                size="lg"
                                className="w-full"
                                variant={isPro ? 'default' : 'outline'}
                                onClick={() => handleSubscribe(plan.name)}
                                disabled={subscribing}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
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

            {/* Informações adicionais */}
            <div className="text-center text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                <p className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Cancele a qualquer momento, sem multas
                </p>
                <p className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Pagamento seguro via Stripe
                </p>
            </div>
        </div>
    );
}

export default SubscriptionPlansInline;
