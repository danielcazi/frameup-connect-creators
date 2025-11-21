import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { CheckCircle2, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    async function checkPaymentStatus() {
      if (!id || !user) {
        navigate('/creator/dashboard');
        return;
      }

      // Wait for webhook to process (may take 1-2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('creator_id', user.id)
        .single();

      if (error || !data) {
        console.error('Error fetching project:', error);
        navigate('/creator/dashboard');
        return;
      }

      // Verify payment was successful
      if (data.payment_status !== 'paid') {
        navigate(`/creator/project/${id}/payment`);
        return;
      }

      setProject(data);
      setLoading(false);
    }

    checkPaymentStatus();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Confirmando pagamento...</p>
        </div>
      </div>
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
