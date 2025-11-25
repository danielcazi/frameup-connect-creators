import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function SubscriptionSuccess() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        if (!sessionId) {
            setError('Sessão inválida');
            setLoading(false);
            return;
        }

        // Aguardar webhook processar (3 segundos inicial)
        const timer = setTimeout(() => {
            checkSubscription();
        }, 3000);

        return () => clearTimeout(timer);
    }, [sessionId]);

    async function checkSubscription() {
        if (!user) return;

        try {
            // Buscar assinatura criada
            const { data, error: subError } = await supabase
                .from('user_subscriptions')
                .select(`
          *,
          subscription_plans (*)
        `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (subError && subError.code !== 'PGRST116') {
                throw subError;
            }

            if (!data) {
                if (retryCount < 5) {
                    // Tentar novamente
                    setRetryCount(prev => prev + 1);
                    setTimeout(checkSubscription, 2000);
                    return;
                } else {
                    throw new Error('Assinatura não encontrada após várias tentativas');
                }
            }

            setSubscription(data);
            setLoading(false);
        } catch (err: any) {
            console.error('Error checking subscription:', err);
            // Se ainda estiver carregando (retry loop), não mostrar erro final ainda
            if (retryCount >= 5) {
                setError('Aguardando confirmação do pagamento...');
                setLoading(false);
            }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Confirmando sua assinatura...</p>
                    <p className="text-sm text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
                </div>
            </div>
        );
    }

    if (error && !subscription) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <Card className="max-w-md w-full text-center p-8">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                        Processando Pagamento
                    </h2>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <p className="text-sm text-muted-foreground mb-6">
                        Você receberá uma confirmação por email em breve.
                    </p>
                    <Button onClick={() => navigate('/editor/dashboard')}>
                        Ir para Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4">
            <div className="max-w-2xl w-full">
                {/* Success Card */}
                <Card className="text-center mb-6 p-8 border-green-200 dark:border-green-900 shadow-lg">
                    {/* Success Icon */}
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        Assinatura Ativada! 🎉
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8">
                        Parabéns! Sua assinatura do{' '}
                        <span className="font-semibold text-primary">
                            {subscription?.subscription_plans?.display_name}
                        </span>
                        {' '}foi ativada com sucesso.
                    </p>

                    {/* Subscription Details */}
                    <div className="bg-muted/30 rounded-lg p-6 mb-8 text-left border border-border">
                        <h3 className="font-semibold text-foreground mb-4">
                            Detalhes da Assinatura
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plano:</span>
                                <span className="font-medium text-foreground">
                                    {subscription?.subscription_plans?.display_name}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Valor:</span>
                                <span className="font-medium text-foreground">
                                    R$ {Number(subscription?.subscription_plans?.price).toFixed(2).replace('.', ',')} / mês
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Projetos simultâneos:</span>
                                <span className="font-medium text-foreground">
                                    {subscription?.subscription_plans?.max_simultaneous_projects}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Próxima cobrança:</span>
                                <span className="font-medium text-foreground">
                                    {new Date(subscription?.current_period_end).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 mb-8 text-left border border-blue-100 dark:border-blue-900">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">
                            Próximos Passos
                        </h3>

                        <ol className="space-y-3 list-decimal list-inside text-blue-800 dark:text-blue-200">
                            <li>Complete seu perfil de editor</li>
                            <li>Adicione vídeos ao seu portfólio</li>
                            <li>Comece a se candidatar a projetos</li>
                            <li>Comunique-se com criadores via chat</li>
                        </ol>
                    </div>

                    {/* CTA Button */}
                    <div className="space-y-3">
                        <Button
                            size="lg"
                            className="w-full"
                            onClick={() => navigate('/editor/dashboard')}
                        >
                            Ir para Dashboard
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="lg"
                            className="w-full"
                            onClick={() => navigate('/editor/profile/edit')} // TODO: Criar rota de perfil
                        >
                            Completar Perfil Agora
                        </Button>
                    </div>
                </Card>

                {/* Email Confirmation */}
                <Card className="text-center p-4 bg-muted/50 border-none">
                    <p className="text-sm text-muted-foreground">
                        Um email de confirmação foi enviado para{' '}
                        <span className="font-medium text-foreground">{user?.email}</span>
                    </p>
                </Card>
            </div>
        </div>
    );
}

export default SubscriptionSuccess;
