import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video, ArrowLeft } from 'lucide-react';

const RecoverPassword = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-light to-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 transition-transform hover:scale-105">
            <Video className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">FRAMEUP</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Recuperar Senha</h1>
            <p className="text-sm text-muted-foreground">
              Página em desenvolvimento
            </p>
          </div>

          <div className="space-y-4">
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Login
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoverPassword;
