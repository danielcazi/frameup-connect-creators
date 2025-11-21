import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Zap, Crown, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price: number;
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
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar planos',
      });
    } finally {
      setLoading(false);
    }
  }

  async function checkExistingSubscription() {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('editor_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('editor_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        toast({
          title: 'Assinatura Ativa',
          description: 'Você já possui uma assinatura ativa',
        });
        navigate('/editor/subscription/manage');
      }
    } catch (error) {
      // Sem assinatura ativa - OK
      console.log('No active subscription found');
    }
  }

  async function handleSubscribe(planId: string, stripePriceId: string) {
    if (!user?.id || !user?.email) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado',
      });
      return;
    }

    setSubscribing(true);
    setSelectedPlan(planId);

    try {
      // Chamar Edge Function para criar checkout
      const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        {
          body: {
            priceId: stripePriceId,
            userId: user.id,
            userEmail: user.email,
          },
        }
      );

      if (error) throw error;

      // Redirecionar para Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao processar',
        description: error.message || 'Erro ao processar assinatura',
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

  return (
    <DashboardLayout
      userType="editor"
      title="Escolha seu Plano"
      subtitle="Assine para acessar projetos e começar a trabalhar"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Planos Simples e Transparentes
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o plano ideal para o seu volume de trabalho
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.has_highlight_badge
                  ? 'border-2 border-primary shadow-lg'
                  : ''
              }`}
            >
              {/* Badge PRO */}
              {plan.has_highlight_badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-lg">
                    <Crown className="w-4 h-4" />
                    Mais Popular
                  </div>
                </div>
              )}

              <CardContent className="p-6">
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
                  <h3 className="text-2xl font-bold mb-2">
                    {plan.display_name}
                  </h3>

                  {/* Preço */}
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Até {plan.max_simultaneous_projects} projetos simultâneos
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={plan.has_highlight_badge ? 'default' : 'secondary'}
                  size="lg"
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id, plan.stripe_price_id)}
                  disabled={subscribing}
                >
                  {subscribing && selectedPlan === plan.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    `Assinar ${plan.display_name}`
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ / Info */}
        <Card className="bg-muted/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Informações sobre a assinatura
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Cancele a qualquer momento, sem multas</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Upgrade ou downgrade quando quiser</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Pagamento seguro via Stripe</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Suporte dedicado para assinantes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default SubscriptionPlans;
