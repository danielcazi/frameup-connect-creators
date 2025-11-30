import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Video, ArrowLeft, Mail, Loader2, CheckCircle, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const requestResetSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
});

const newPasswordSchema = z.object({
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .max(100, 'A senha é muito longa')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

const RecoverPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { resetPassword } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
  });

  const passwordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  useEffect(() => {
    // Check for recovery mode
    const accessToken = searchParams.get('access_token');
    const type = searchParams.get('type');
    const errorDescription = searchParams.get('error_description');

    // Also check hash fragment as Supabase sometimes sends it there
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashType = hashParams.get('type');
    const hashError = hashParams.get('error_description');

    if (errorDescription || hashError) {
      setResetError(errorDescription || hashError);
      return;
    }

    if (type === 'recovery' || hashType === 'recovery') {
      setIsResetMode(true);
    }
  }, [searchParams]);

  const handleRequestReset = async (data: RequestResetFormData) => {
    setIsLoading(true);
    try {
      // Por segurança, não revelamos se o email existe ou não.
      // Apenas enviamos a solicitação e mostramos a mensagem de sucesso.
      await resetPassword(data.email);

      setSentEmail(data.email);
      setEmailSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Se o email existir em nossa base, você receberá um link de recuperação.',
      });
    } catch (error) {
      console.error('Erro ao solicitar reset:', error);
      // Mesmo com erro, mostramos sucesso para evitar enumeração de usuários
      setSentEmail(data.email);
      setEmailSent(true);
      toast({
        title: 'Email enviado!',
        description: 'Se o email existir em nossa base, você receberá um link de recuperação.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!sentEmail) return;

    setIsLoading(true);
    try {
      await resetPassword(sentEmail);
      toast({
        title: 'Email reenviado!',
        description: 'Verifique sua caixa de entrada novamente.',
      });
    } catch (error) {
      console.error('Erro ao reenviar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar',
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseAnotherEmail = () => {
    setEmailSent(false);
    setSentEmail('');
    requestForm.reset();
  };

  const handleSetNewPassword = async (data: NewPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        if (error.message.includes('Auth session missing')) {
          throw new Error('Sessão expirada. Solicite um novo link de recuperação.');
        }
        if (error.message.includes('same password')) {
          throw new Error('A nova senha deve ser diferente da anterior.');
        }
        throw error;
      }

      setResetSuccess(true);
      toast({
        title: 'Senha atualizada!',
        description: 'Sua senha foi alterada com sucesso. Você será redirecionado.',
      });

      await supabase.auth.signOut();
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Renderização Condicional
  if (resetError) {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">Link Inválido</h1>
              <p className="text-sm text-muted-foreground">
                {resetError || 'O link de recuperação expirou ou é inválido.'}
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  setResetError(null);
                  setIsResetMode(false);
                  navigate('/recuperar-senha', { replace: true });
                }}
                className="w-full"
              >
                Solicitar novo link
              </Button>
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
  }

  if (resetSuccess) {
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">Senha Atualizada!</h1>
              <p className="text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Você será redirecionado para o login em instantes...
              </p>
            </div>

            <Button asChild className="w-full">
              <Link to="/login">Ir para Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isResetMode) {
    const password = passwordForm.watch('password');
    const confirmPassword = passwordForm.watch('confirmPassword');
    const isPasswordValid = !passwordForm.formState.errors.password && password?.length >= 8;
    const isConfirmValid = !passwordForm.formState.errors.confirmPassword && confirmPassword === password && confirmPassword?.length > 0;

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
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">Definir Nova Senha</h1>
              <p className="text-sm text-muted-foreground">
                Escolha uma senha forte para sua conta
              </p>
            </div>

            <form onSubmit={passwordForm.handleSubmit(handleSetNewPassword)} className="space-y-4">
              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pr-10 ${isPasswordValid
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : passwordForm.formState.errors.password
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                      }`}
                    {...passwordForm.register('password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}

                {/* Requisitos da senha */}
                {password && (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className={password.length >= 8 ? 'text-green-600 flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                      {password.length >= 8 ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 border rounded-full" />} Mínimo 8 caracteres
                    </p>
                    <p className={/[A-Z]/.test(password) ? 'text-green-600 flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                      {/[A-Z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 border rounded-full" />} Uma letra maiúscula
                    </p>
                    <p className={/[a-z]/.test(password) ? 'text-green-600 flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                      {/[a-z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 border rounded-full" />} Uma letra minúscula
                    </p>
                    <p className={/[0-9]/.test(password) ? 'text-green-600 flex items-center gap-1' : 'text-muted-foreground flex items-center gap-1'}>
                      {/[0-9]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 border rounded-full" />} Um número
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`pr-10 ${isConfirmValid
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : passwordForm.formState.errors.confirmPassword
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                      }`}
                    {...passwordForm.register('confirmPassword')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </form>

            <div className="mt-6">
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
  }

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-light to-background px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2 transition-transform hover:scale-105">
              <Video className="h-10 w-10 text-primary" />
              <span className="text-3xl font-bold text-foreground">FRAMEUP</span>
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-8 h-8 text-green-600" />
            </div>

            <h2 className="text-2xl font-bold text-foreground mb-2">Verifique seu Email</h2>

            <p className="text-muted-foreground mb-6">
              Enviamos um link de recuperação para:<br />
              <span className="font-bold text-foreground">{sentEmail}</span>
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
              <p>Não recebeu o email? Verifique sua pasta de spam ou clique abaixo para reenviar.</p>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  'Reenviar Email'
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={handleUseAnotherEmail}
              >
                Usar outro email
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para Login
                </Link>
              </Button>
            </div>
          </div>

          {/* Dica */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            O link de recuperação expira em 1 hora.
          </p>
        </div>
      </div>
    );
  }

  // Tela Inicial - Solicitar Reset
  const email = requestForm.watch('email');
  const isEmailValid = !requestForm.formState.errors.email && email?.length > 0;

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
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Recuperar Senha</h1>
            <p className="text-sm text-muted-foreground">
              Digite seu email para receber o link de recuperação
            </p>
          </div>

          <form onSubmit={requestForm.handleSubmit(handleRequestReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className={`pl-10 ${isEmailValid
                    ? 'border-green-500 focus-visible:ring-green-500'
                    : requestForm.formState.errors.email
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : ''
                    }`}
                  {...requestForm.register('email')}
                  autoComplete="email"
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                {isEmailValid && (
                  <CheckCircle className="absolute right-3 top-2.5 h-5 w-5 text-green-500" />
                )}
              </div>
              {requestForm.formState.errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {requestForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Link de Recuperação
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Login
              </Link>
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="font-medium text-primary hover:underline">
                Cadastre-se
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecoverPassword;
