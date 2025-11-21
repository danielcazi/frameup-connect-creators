import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    try {
      const { data, error } = await supabase
        .from('editor_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('editor_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar assinatura',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadCurrentProjects() {
    try {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_editor_id', user!.id)
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
        title: 'Erro',
        description: error.message || 'Erro ao cancelar assinatura',
        variant: 'destructive'
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
        title: 'Assinatura reativada',
        description: 'Sua assinatura foi reativada com sucesso!'
      });

      loadSubscription();
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao reativar assinatura',
        variant: 'destructive'
      });
    } finally {
      setReactivating(false);
    }
  }

  async function handleUpdatePaymentMethod() {
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customer_id: subscription!.stripe_customer_id,
          return_url: window.location.href
        }
      });

      if (error) throw error;

      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening portal:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao abrir portal de pagamento',
        variant: 'destructive'
      });
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Pagamento Pendente</Badge>;
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
        <Card className="text-center">
          <CardContent className="pt-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
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
          </CardContent>
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
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {subscription.subscription_plans.display_name}
                </CardTitle>
                <p className="text-muted-foreground">
                  R$ {subscription.subscription_plans.price.toFixed(2).replace('.', ',')}/mês
                </p>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alertas */}
            {subscription.status === 'past_due' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Pagamento Pendente</p>
                  <p className="text-sm mb-3">
                    Há um problema com seu método de pagamento. Atualize suas informações para manter o acesso.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdatePaymentMethod}
                  >
                    Atualizar Pagamento
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {subscription.cancel_at_period_end && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">Assinatura Cancelada</p>
                  <p className="text-sm mb-3">
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
                </AlertDescription>
              </Alert>
            )}

            {/* Info Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">
                    {subscription.cancel_at_period_end ? 'Acesso até' : 'Próxima Cobrança'}
                  </span>
                </div>
                <p className="text-2xl font-bold">
                  {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">Projetos Simultâneos</span>
                </div>
                <p className="text-2xl font-bold">
                  {currentProjects} / {subscription.subscription_plans.max_simultaneous_projects}
                </p>
                {currentProjects >= subscription.subscription_plans.max_simultaneous_projects && (
                  <p className="text-sm text-yellow-600 mt-1">Limite atingido</p>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Recursos do Plano</h3>
              <ul className="space-y-2">
                {subscription.subscription_plans.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Atualizar Pagamento */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Atualizar Forma de Pagamento</p>
                  <p className="text-sm text-muted-foreground">Alterar cartão de crédito</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={handleUpdatePaymentMethod}
              >
                Gerenciar
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Upgrade */}
            {subscription.subscription_plans.name === 'basic' && (
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Fazer Upgrade para PRO</p>
                    <p className="text-sm text-muted-foreground">
                      4 projetos simultâneos + badge de destaque
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/editor/subscription/plans')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            )}

            {/* Cancelar */}
            {!subscription.cancel_at_period_end && subscription.status === 'active' && (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="font-medium">Cancelar Assinatura</p>
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
          </CardContent>
        </Card>

        {/* Histórico de Faturas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Em breve você poderá visualizar e baixar suas faturas aqui.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default ManageSubscription;
