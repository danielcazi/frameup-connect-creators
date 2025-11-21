import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { AlertCircle, XCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SubscriptionBanner() {
  const { userType } = useAuth();
  const { subscription, loading } = useSubscription();
  const navigate = useNavigate();
  
  const [dismissed, setDismissed] = useState(false);

  if (userType !== 'editor' || loading) {
    return null;
  }

  if (!subscription) {
    return (
      <div className="bg-yellow-600 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Você precisa assinar um plano para acessar projetos
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/editor/subscription/plans')}
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.status === 'past_due' && !dismissed) {
    return (
      <div className="bg-red-600 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Há um problema com o pagamento da sua assinatura. Atualize seu método de pagamento para manter o acesso.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/editor/subscription/manage')}
              >
                Atualizar Pagamento
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.cancel_at_period_end && !dismissed) {
    const daysLeft = Math.ceil(
      (new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <div className="bg-yellow-600 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                Sua assinatura foi cancelada. Você ainda tem {daysLeft} dia{daysLeft !== 1 ? 's' : ''} de acesso.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/editor/subscription/manage')}
              >
                Reativar
              </Button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dispensar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default SubscriptionBanner;
