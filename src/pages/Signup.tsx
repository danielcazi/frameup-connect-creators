import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userType = searchParams.get('tipo');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Video className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Bem-vindo ao FRAMEUP</h1>
          <p className="text-muted-foreground">
            {userType === 'creator' 
              ? 'Crie sua conta como Creator' 
              : userType === 'editor' 
              ? 'Crie sua conta como Editor' 
              : 'Escolha como deseja começar'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <p className="text-center text-muted-foreground">
            Página de cadastro em desenvolvimento
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

export default Signup;
