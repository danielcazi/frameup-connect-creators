import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Video className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Entrar no FRAMEUP</h1>
          <p className="text-muted-foreground">Acesse sua conta</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-center text-muted-foreground">
            Página de login em desenvolvimento
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => navigate('/')}>
              Voltar para Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
