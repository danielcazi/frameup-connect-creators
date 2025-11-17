import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Scissors, Eye, EyeOff, Check, X, Upload, Link as LinkIcon } from 'lucide-react';

const signupSchema = z.object({
  userType: z.enum(['creator', 'editor'], {
    required_error: 'Selecione o tipo de usuário',
  }),
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  username: z
    .string()
    .min(3, 'Username deve ter no mínimo 3 caracteres')
    .max(20, 'Username deve ter no máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'Apenas letras, números e underscore'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, 'Telefone inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter pelo menos 1 letra maiúscula')
    .regex(/[0-9]/, 'Senha deve ter pelo menos 1 número'),
  avatarType: z.enum(['upload', 'url', 'none']).default('none'),
  avatarUrl: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos',
  }),
});

type SignupForm = z.infer<typeof signupSchema>;

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('tipo') as 'creator' | 'editor' | null;

  const [selectedType, setSelectedType] = useState<'creator' | 'editor' | null>(
    initialType
  );
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarInputType, setAvatarInputType] = useState<'upload' | 'url'>('upload');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      userType: initialType || undefined,
      avatarType: 'none',
    },
  });

  const password = watch('password');
  const username = watch('username');

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    
    if (strength <= 2) return { label: 'Fraca', color: 'text-destructive' };
    if (strength === 3) return { label: 'Média', color: 'text-warning' };
    return { label: 'Forte', color: 'text-success' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Phone mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
      if (value.length < 6) {
        value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
      }
      setValue('phone', value);
    }
  };

  // Username availability check (mock)
  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameStatus(null);
      return;
    }
    
    setUsernameStatus('checking');
    
    // Simulate API check
    setTimeout(() => {
      // Mock: usernames with 'admin' are taken
      const isTaken = username.toLowerCase().includes('admin');
      setUsernameStatus(isTaken ? 'taken' : 'available');
    }, 500);
  };

  // Handle username change with debounce
  useState(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  });

  const handleTypeSelect = (type: 'creator' | 'editor') => {
    setSelectedType(type);
    setValue('userType', type);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setValue('avatarType', 'upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAvatarPreview(url);
    setValue('avatarUrl', url);
    setValue('avatarType', 'url');
  };

  const onSubmit = (data: SignupForm) => {
    console.log('Form data:', data);
    // Logic will be implemented in next prompt
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const fullName = watch('fullName') || '';

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Video className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Crie seu Perfil na FRAMEUP
          </h1>
          <p className="text-muted-foreground">Conecte-se com os melhores talentos</p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* User Type Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Você é:</Label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Creator Card */}
                <button
                  type="button"
                  onClick={() => handleTypeSelect('creator')}
                  className={`rounded-lg border-2 p-6 text-left transition-all ${
                    selectedType === 'creator'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="mb-3 text-4xl">📹</div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">CREATOR</h3>
                  <p className="text-sm text-muted-foreground">
                    Preciso de edição de vídeos
                  </p>
                </button>

                {/* Editor Card */}
                <button
                  type="button"
                  onClick={() => handleTypeSelect('editor')}
                  className={`rounded-lg border-2 p-6 text-left transition-all ${
                    selectedType === 'editor'
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="mb-3 text-4xl">✂️</div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">EDITOR</h3>
                  <p className="text-sm text-muted-foreground">Quero editar vídeos</p>
                </button>
              </div>
              {errors.userType && (
                <p className="text-sm text-destructive">{errors.userType.message}</p>
              )}
            </div>

            {/* Form Fields - Show after type selection */}
            {selectedType && (
              <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                <div>
                  <h2 className="mb-4 text-xl font-semibold text-foreground">
                    DADOS PESSOAIS
                  </h2>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">
                        Nome Completo <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="João Silva"
                        {...register('fullName')}
                        className={errors.fullName ? 'border-destructive' : ''}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <Label htmlFor="username">
                        Nome de Usuário <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="username"
                          placeholder="joaosilva"
                          {...register('username')}
                          onChange={(e) => {
                            register('username').onChange(e);
                            setUsernameStatus('checking');
                            setTimeout(() => checkUsernameAvailability(e.target.value), 500);
                          }}
                          className={
                            errors.username
                              ? 'border-destructive pr-10'
                              : usernameStatus === 'available'
                              ? 'border-success pr-10'
                              : usernameStatus === 'taken'
                              ? 'border-destructive pr-10'
                              : 'pr-10'
                          }
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {usernameStatus === 'checking' && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          )}
                          {usernameStatus === 'available' && (
                            <Check className="h-4 w-4 text-success" />
                          )}
                          {usernameStatus === 'taken' && (
                            <X className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      {errors.username && (
                        <p className="text-sm text-destructive">
                          {errors.username.message}
                        </p>
                      )}
                      {usernameStatus === 'taken' && (
                        <p className="text-sm text-destructive">
                          Nome de usuário já está em uso
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        {...register('email')}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Telefone <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="(00) 00000-0000"
                        {...register('phone')}
                        onChange={handlePhoneChange}
                        className={errors.phone ? 'border-destructive' : ''}
                        maxLength={15}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        Senha <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...register('password')}
                          className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordStrength && (
                        <p className={`text-sm font-medium ${passwordStrength.color}`}>
                          Força: {passwordStrength.label}
                        </p>
                      )}
                      {errors.password && (
                        <p className="text-sm text-destructive">
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Avatar Upload */}
                    <div className="space-y-2">
                      <Label>Foto de Perfil (opcional)</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={avatarPreview || undefined} />
                          <AvatarFallback className="text-lg">
                            {fullName ? getInitials(fullName) : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={avatarInputType === 'upload' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setAvatarInputType('upload')}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload
                            </Button>
                            <Button
                              type="button"
                              variant={avatarInputType === 'url' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setAvatarInputType('url')}
                            >
                              <LinkIcon className="mr-2 h-4 w-4" />
                              URL
                            </Button>
                          </div>
                          {avatarInputType === 'upload' ? (
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="text-sm"
                            />
                          ) : (
                            <Input
                              type="url"
                              placeholder="https://exemplo.com/foto.jpg"
                              onChange={handleAvatarUrlChange}
                              className="text-sm"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms and Submit */}
                <div className="space-y-4 border-t border-border pt-6">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      onCheckedChange={(checked) =>
                        setValue('termsAccepted', checked as boolean)
                      }
                    />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      Aceito os{' '}
                      <a href="/termos" className="text-primary hover:underline">
                        Termos de Serviço
                      </a>{' '}
                      e{' '}
                      <a href="/privacidade" className="text-primary hover:underline">
                        Política de Privacidade
                      </a>
                    </label>
                  </div>
                  {errors.termsAccepted && (
                    <p className="text-sm text-destructive">
                      {errors.termsAccepted.message}
                    </p>
                  )}

                  <Button type="submit" className="w-full" size="lg">
                    Continuar
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Já tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-primary hover:underline"
                    >
                      Fazer Login
                    </button>
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
