import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  total_paid_by_creator: number;
  status: string;
  payment_status: string;
  stripe_payment_intent_id: string;
}

function PaymentSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManualCheck, setShowManualCheck] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    async function checkPaymentStatus() {
      if (!id || !user) {
        navigate('/creator/dashboard');
        return;
      }

      const MAX_ATTEMPTS = 10;
      const DELAY_MS = 2000;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // Wait before checking
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));

        const { data, error } = await supabase
          .from('projects')
          .select('id, title, total_paid_by_creator, status, payment_status, stripe_payment_intent_id')
          .eq('id', id)
          .eq('creator_id', user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching project:', error);
          continue;
        }

        setProject(data);

        // Check if payment was confirmed by webhook
        if (data.payment_status === 'paid' && data.status === 'open') {
          setPaymentConfirmed(true);
          setLoading(false);
          return;
        }

        // Show progress to user
        console.log(`Checking payment status... Attempt ${attempt + 1}/${MAX_ATTEMPTS}`);
      }

      // After max attempts, show manual check message
      setShowManualCheck(true);
      setLoading(false);
    }

    checkPaymentStatus();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <DashboardLayout 
        userType="creator"
        title="Confirmando Pagamento"
        subtitle="Aguarde enquanto verificamos seu pagamento"
      >
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">Confirmando pagamento...</p>
            <p className="text-xs text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show manual check message if webhook failed
  if (showManualCheck && !paymentConfirmed) {
    return (
      <DashboardLayout 
        userType="creator"
        title="Pagamento em Processamento"
        subtitle="Estamos confirmando seu pagamento"
      >
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card variant="default" padding="large" className="text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-3">
              Pagamento em Processamento
            </h1>
            
            <p className="text-muted-foreground mb-6">
              Seu pagamento foi realizado com sucesso, mas ainda estamos confirmando com o banco.
              Isso pode levar alguns minutos.
            </p>

            <div className="p-4 bg-primary/10 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold mb-2 text-foreground">✅ O que já foi feito:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Seu pagamento foi processado com sucesso</li>
                <li>• O valor está reservado em nossa plataforma</li>
                <li>• Você receberá um email de confirmação</li>
              </ul>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold mb-2 text-foreground">⏳ Próximos passos:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Aguarde alguns minutos para a confirmação final</li>
                <li>• Recarregue esta página para verificar o status</li>
                <li>• Se necessário, entre em contato com o suporte</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="large"
                onClick={() => window.location.reload()}
              >
                🔄 Recarregar Página
              </Button>
              
              <Button
                variant="secondary"
                size="large"
                onClick={() => navigate('/creator/dashboard')}
              >
                Ir para Dashboard
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Precisa de ajuda?{' '}
              <a href="mailto:suporte@frameup.com" className="text-primary underline">
                suporte@frameup.com
              </a>
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout 
      userType="creator"
      title="Pagamento Confirmado"
      subtitle="Seu projeto foi publicado com sucesso"
    >
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card variant="default" padding="large" className="text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Message */}
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Pagamento Confirmado!
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Seu projeto foi publicado no marketplace e editores já podem se candidatar.
          </p>

          {/* Project Information */}
          <div className="bg-primary/5 rounded-lg p-6 mb-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Projeto:</span>
                <span className="font-semibold text-foreground">{project.title}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Pago:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  R$ {project.total_paid_by_creator.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge status={project.status as 'open' | 'in_progress' | 'in_review' | 'completed' | 'cancelled'} />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ID da Transação:</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {project.stripe_payment_intent_id?.slice(0, 20)}...
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="text-left mb-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-3 text-foreground">📋 Próximos Passos:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">1.</span>
                <span>Editores verão seu projeto no marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">2.</span>
                <span>Até 5 editores podem se candidatar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">3.</span>
                <span>Você analisa os perfis e escolhe o melhor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">4.</span>
                <span>Acompanha a edição via chat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground">5.</span>
                <span>Aprova o vídeo final e o pagamento é liberado ao editor</span>
              </li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate(`/creator/project/${id}/preview`)}
            >
              Ver Projeto
            </Button>
            
            <Button
              variant="secondary"
              size="large"
              onClick={() => navigate('/creator/dashboard')}
            >
              Ir para Dashboard
            </Button>
          </div>

          {/* Email Notice */}
          <p className="text-xs text-muted-foreground mt-6">
            📧 Você receberá um email de confirmação em breve
          </p>
        </Card>

        {/* Support Card */}
        <Card variant="default" padding="medium" className="mt-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">💬</div>
            <div className="flex-1 text-left">
              <h4 className="font-semibold mb-1 text-foreground">Precisa de ajuda?</h4>
              <p className="text-sm text-muted-foreground">
                Nossa equipe está disponível para esclarecer qualquer dúvida.
              </p>
            </div>
            <Button variant="ghost" size="small">
              Contato
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default PaymentSuccess;
