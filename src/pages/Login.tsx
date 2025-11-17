import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: 'Email inválido' })
    .max(255, { message: 'Email muito longo' }),
  password: z
    .string()
    .min(8, { message: 'Senha deve ter no mínimo 8 caracteres' })
    .max(100, { message: 'Senha muito longa' }),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const userType = user.user_metadata?.user_type;
      if (userType === 'creator') {
        navigate('/creator/dashboard');
      } else if (userType === 'editor') {
        navigate('/editor/dashboard');
      }
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const { error, userType } = await signIn(data.email, data.password);

      if (error) {
        // Handle specific error messages
        let errorMessage = 'Erro ao fazer login. Tente novamente';
        
        if (error.message.includes('Supabase não configurado')) {
          errorMessage = 'Backend não configurado. Por favor, conecte o Lovable Cloud para habilitar autenticação.';
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirme seu email antes de fazer login';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'Usuário não encontrado';
        }

        toast({
          variant: 'destructive',
          title: 'Erro ao fazer login',
          description: errorMessage,
        });
        return;
      }

      // Success - redirect based on user type
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Redirecionando...',
      });

      // Redirect based on user type
      if (userType === 'creator') {
        navigate('/creator/dashboard');
      } else if (userType === 'editor') {
        navigate('/editor/dashboard');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Ocorreu um erro. Por favor, tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const email = watch('email');
  const password = watch('password');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-light to-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 transition-transform hover:scale-105">
            <Video className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">FRAMEUP</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Entre na sua conta</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className={`transition-all duration-200 ${
                  email && !errors.email
                    ? 'border-success focus-visible:ring-success'
                    : errors.email
                    ? 'border-error focus-visible:ring-error'
                    : ''
                }`}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`pr-10 transition-all duration-200 ${
                    password && !errors.password
                      ? 'border-success focus-visible:ring-success'
                      : errors.password
                      ? 'border-error focus-visible:ring-error'
                      : ''
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-error">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register('rememberMe')} />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-muted-foreground cursor-pointer select-none"
                >
                  Lembrar-me
                </label>
              </div>
              <Link
                to="/recuperar-senha"
                className="text-sm text-primary hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover"
              disabled={!isValid || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não tem conta?{' '}
              <Link to="/cadastro" className="font-semibold text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao fazer login, você concorda com nossos{' '}
          <a href="#" className="underline hover:text-foreground">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="#" className="underline hover:text-foreground">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
