import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Página legada de pricing - redireciona para a página oficial de planos
 * Mantida apenas para compatibilidade com links antigos
 */
function EditorPricing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para a página oficial de planos de assinatura
    navigate('/editor/subscription/plans', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}

export default EditorPricing;
