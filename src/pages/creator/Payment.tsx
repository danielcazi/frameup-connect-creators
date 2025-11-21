import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  base_price: number;
  platform_fee: number;
  total_paid_by_creator: number;
  status: string;
  payment_status: string;
}

function CheckoutForm({ projectId, amount }: { projectId: string; amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/creator/project/${projectId}/payment-success`,
        },
        redirect: 'if_required'
      });

      if (error) {
        setErrorMessage(error.message || 'Erro ao processar pagamento');
        setProcessing(false);
        
        toast({
          title: 'Erro no pagamento',
          description: error.message || 'Erro ao processar pagamento',
          variant: 'destructive',
        });
      } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
        toast({
          title: 'Pagamento realizado!',
          description: 'Seu projeto será publicado em breve.',
        });
        
        navigate(`/creator/project/${projectId}/payment-success`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorMessage(errorMsg);
      setProcessing(false);
      
      toast({
        title: 'Erro no pagamento',
        description: errorMsg,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          `Pagar R$ ${amount.toFixed(2)}`
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        🔒 Pagamento seguro e criptografado via Stripe
      </p>
    </form>
  );
}

function PaymentSummaryCard({ project }: { project: Project }) {
  return (
    <div className="sticky top-24">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumo do Pagamento</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Edição base</span>
            <span className="font-semibold">
              R$ {project.base_price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa da plataforma (5%)</span>
            <span className="font-semibold">
              R$ {project.platform_fee.toFixed(2)}
            </span>
          </div>
          
          <div className="border-t pt-3 flex justify-between">
            <span className="font-bold">TOTAL</span>
            <span className="font-bold text-2xl text-primary">
              R$ {project.total_paid_by_creator.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="p-4 bg-primary/10 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <span className="text-primary">ℹ️</span>
            <div className="text-xs">
              <p className="font-semibold mb-2">Como funciona:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Seu pagamento fica retido na plataforma</li>
                <li>• Editores se candidatam ao projeto</li>
                <li>• Você escolhe o melhor editor</li>
                <li>• Pagamento liberado após sua aprovação</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <DashboardLayout
      userType="creator"
      title="Pagamento"
      subtitle="Finalize o pagamento para publicar seu projeto"
    >
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </DashboardLayout>
  );
}

export default function Payment() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initialize() {
      if (!user || !id) {
        navigate('/creator/dashboard');
        return;
      }

      try {
        // 1. Fetch project
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .eq('creator_id', user.id)
          .eq('status', 'draft')
          .eq('payment_status', 'pending')
          .maybeSingle();

        if (projectError || !projectData) {
          toast({
            title: 'Erro',
            description: 'Projeto não encontrado ou já foi pago',
            variant: 'destructive',
          });
          navigate('/creator/dashboard');
          return;
        }

        setProject(projectData);

        // 2. Create Payment Intent
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('create-payment-intent', {
          body: {
            project_id: projectData.id,
            amount: projectData.total_paid_by_creator,
            creator_id: user.id,
            editor_receives: projectData.base_price
          }
        });

        if (response.error) {
          throw new Error(response.error.message || 'Erro ao criar pagamento');
        }

        const { clientSecret: secret } = response.data;

        if (!secret) {
          throw new Error('Client secret não recebido');
        }

        setClientSecret(secret);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing payment:', error);
        
        toast({
          title: 'Erro ao preparar pagamento',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
        
        navigate('/creator/dashboard');
      }
    }

    initialize();
  }, [id, user, navigate, toast]);

  if (loading) {
    return <LoadingScreen message="Preparando pagamento..." />;
  }

  if (!project || !clientSecret) {
    return null;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: 'hsl(var(--primary))',
      }
    }
  };

  return (
    <DashboardLayout
      userType="creator"
      title="Pagamento"
      subtitle="Finalize o pagamento para publicar seu projeto"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Stripe Checkout */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">
                Informações de Pagamento
              </h2>
              
              <Elements stripe={stripePromise} options={options}>
                <CheckoutForm 
                  projectId={project.id}
                  amount={project.total_paid_by_creator}
                />
              </Elements>
            </Card>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <PaymentSummaryCard project={project} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
