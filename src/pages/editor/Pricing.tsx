import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const EditorPricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-foreground">
            Escolha seu Plano
          </h1>
          <p className="text-lg text-muted-foreground">
            Selecione o plano ideal para começar a receber projetos
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Free Plan */}
          <div className="rounded-xl border-2 border-border bg-card p-8">
            <h3 className="mb-2 text-2xl font-bold text-foreground">Gratuito</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">R$ 0</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <ul className="mb-8 space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Perfil básico</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Até 3 vídeos no portfólio</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Receber propostas de creators</span>
              </li>
            </ul>
            <Button 
              onClick={() => navigate('/editor/dashboard')}
              variant="outline" 
              className="w-full"
              size="lg"
            >
              Começar Grátis
            </Button>
          </div>

          {/* Premium Plan */}
          <div className="rounded-xl border-2 border-primary bg-card p-8 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-foreground">Premium</h3>
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Popular
              </span>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">R$ 49</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <ul className="mb-8 space-y-3">
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Tudo do plano gratuito</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Portfólio ilimitado</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Destaque nos resultados</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Badge "Editor Premium"</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="text-foreground">Suporte prioritário</span>
              </li>
            </ul>
            <Button 
              onClick={() => navigate('/editor/dashboard')}
              className="w-full" 
              size="lg"
            >
              Assinar Premium
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Você pode pular esta etapa e escolher um plano depois
        </p>
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/editor/dashboard')}
          >
            Pular por enquanto
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditorPricing;
