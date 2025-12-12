import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { CheckCircle, MessageCircle, FileText, LayoutDashboard, AlertTriangle, RefreshCw } from 'lucide-react';

export default function PaymentSuccess() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const MAX_RETRIES = 10; // 10 tentativas de 2s = 20s total

        async function checkPaymentStatus(attempt = 0) {
            if (!id) return;

            try {
                // Verificar parâmetros de URL (para update imediato no front em dev)
                const searchParams = new URLSearchParams(window.location.search);
                const paymentIntentSecret = searchParams.get('payment_intent_client_secret');
                const redirectStatus = searchParams.get('redirect_status');

                if (redirectStatus === 'succeeded' && paymentIntentSecret) {
                    // Forçar update se for sucesso (útil para dev sem webhook)
                    await supabase
                        .from('projects')
                        .update({
                            status: 'open',
                            payment_status: 'paid',
                            payment_intent_id: paymentIntentSecret.split('_secret_')[0],
                            paid_at: new Date().toISOString()
                        })
                        .eq('id', id)
                        .eq('payment_status', 'pending'); // Só se ainda estiver pendente
                }

                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (!data) {
                    throw new Error('Projeto não encontrado');
                }

                // Verificar se o pagamento foi confirmado (status 'open' ou payment_status 'paid')
                if (data.payment_status === 'paid' || data.status === 'open') {
                    if (isMounted) {
                        setProject(data);
                        setLoading(false);
                    }
                    return;
                }

                // Se ainda não confirmou e temos tentativas restantes, tentar novamente
                if (attempt < MAX_RETRIES) {
                    if (isMounted) {
                        // Feedback visual opcional: setLoadingMessage(`Confirmando pagamento... (${attempt + 1}/${MAX_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        checkPaymentStatus(attempt + 1);
                    }
                } else {
                    // Esgotou tentativas
                    if (isMounted) {
                        setError('O pagamento foi processado, mas a confirmação do sistema está demorando mais que o esperado.');
                        setProject(data); // Mostra os dados mesmo assim, mas com aviso
                        setLoading(false);
                    }
                }

            } catch (err: any) {
                console.error(err);
                if (isMounted) {
                    setError(err.message || 'Erro ao verificar status do pagamento.');
                    setLoading(false);
                }
            }
        }

        checkPaymentStatus();

        return () => { isMounted = false; };
    }, [id, retryCount]); // retryCount permite reiniciar o processo manualmente

    const handleManualRetry = () => {
        setLoading(true);
        setError(null);
        setRetryCount(prev => prev + 1);
    };

    if (loading) {
        return (
            <DashboardLayout userType="creator" title="Processando..." subtitle="Confirmando seu pagamento">
                <div className="min-h-[60vh] flex flex-col items-center justify-center animate-pulse">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-semibold mb-2">Confirmando transação</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                        Estamos aguardando a confirmação segura do Stripe. Isso geralmente leva alguns segundos.
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (error && !project) {
        // Erro crítico onde nem o projeto carregou
        return (
            <DashboardLayout userType="creator">
                <div className="max-w-md mx-auto py-12 text-center">
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Algo deu errado</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Button onClick={() => navigate('/creator/dashboard')}>Voltar ao Dashboard</Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout userType="creator">
            <div className="max-w-2xl mx-auto py-8 animate-fade-in">
                <Card className="p-8 text-center border-green-200 dark:border-green-900 shadow-lg relative overflow-hidden">

                    {/* Faixa de aviso se houver erro de confirmação mas projeto carregou */}
                    {error && (
                        <div className="absolute top-0 left-0 w-full bg-yellow-100 dark:bg-yellow-900/30 p-2 text-xs text-yellow-800 dark:text-yellow-200 flex items-center justify-center gap-2">
                            <AlertTriangle className="w-3 h-3" />
                            {error}
                            <Button variant="link" size="sm" className="h-auto p-0 text-yellow-800 underline" onClick={handleManualRetry}>
                                Verificar novamente
                            </Button>
                        </div>
                    )}

                    {/* Ícone de Sucesso */}
                    <div className="mb-6 flex justify-center mt-4">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                    </div>

                    {/* Mensagem */}
                    <h1 className="text-3xl font-bold mb-3 text-foreground">
                        {error ? 'Pagamento Recebido' : 'Pagamento Confirmado!'}
                    </h1>

                    <p className="text-lg text-muted-foreground mb-8">
                        {error
                            ? 'Recebemos seu pagamento. Seu projeto será publicado assim que o sistema finalizar o processamento.'
                            : 'Seu projeto foi publicado no marketplace e editores já podem se candidatar.'}
                    </p>

                    {/* Informações do Projeto */}
                    <div className="bg-muted/30 rounded-lg p-6 mb-8 border border-border">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Projeto:</span>
                                <span className="font-semibold">{project.title}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Valor Pago:</span>
                                <span className="font-bold text-green-600 dark:text-green-400">
                                    R$ {project.total_paid_by_creator?.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                                    {project.status === 'open' ? 'Publicado' : (project.status === 'draft' ? 'Processando...' : project.status)}
                                </Badge>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">ID da Transação:</span>
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {project.stripe_payment_intent_id || 'Pendente...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Próximos Passos */}
                    <div className="text-left mb-8 p-6 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                        <h3 className="font-semibold mb-4 text-blue-900 dark:text-blue-300">📋 Próximos Passos:</h3>
                        <ol className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                            <li className="flex items-start gap-3">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                                <span>Editores verão seu projeto no marketplace</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                                <span>Até 5 editores podem se candidatar</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                                <span>Você analisa os perfis e escolhe o melhor</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">4</span>
                                <span>Acompanha a edição via chat</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="font-bold bg-blue-200 dark:bg-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">5</span>
                                <span>Aprova o vídeo final e o pagamento é liberado ao editor</span>
                            </li>
                        </ol>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={() => navigate(`/creator/project/${id}`)} // Futura página de detalhes
                            disabled={true} // Desabilitado por enquanto
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Projeto (Em breve)
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={() => navigate('/creator/dashboard')}
                        >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Ir para Dashboard
                        </Button>
                    </div>

                    {/* Email */}
                    <p className="text-xs text-muted-foreground mt-8">
                        📧 Você receberá um email de confirmação em breve
                    </p>
                </Card>

                {/* Card de Suporte */}
                <Card className="mt-6 p-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-full">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 text-left">
                            <h4 className="font-semibold mb-1">Precisa de ajuda?</h4>
                            <p className="text-sm text-muted-foreground">
                                Nossa equipe está disponível para esclarecer qualquer dúvida.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm">
                            Contato
                        </Button>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
