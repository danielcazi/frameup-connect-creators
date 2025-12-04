import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import CheckoutForm from '@/components/creator/CheckoutForm';
import { PaymentSummaryCard } from '@/components/creator/PaymentSummaryCard';
import { Button } from '@/components/ui/button';

export default function Payment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [project, setProject] = useState<any>(null);
    const [clientSecret, setClientSecret] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTestAccount, setIsTestAccount] = useState(false);

    const handleTestPayment = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    status: 'open',
                    payment_status: 'paid',
                    published_at: new Date().toISOString()
                })
                .eq('id', project.id);

            if (error) throw error;

            toast({
                title: '🧪 Modo Teste',
                description: 'Projeto publicado com sucesso!',
            });
            navigate('/creator/dashboard');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        async function initialize() {
            if (!user || !id) return;

            // 1. Buscar projeto
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .eq('creator_id', user.id)
                .single();

            if (projectError || !projectData) {
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Projeto não encontrado ou acesso negado.'
                });
                navigate('/creator/dashboard');
                return;
            }

            // Se já estiver pago, redirecionar
            if (projectData.payment_status === 'paid' || projectData.status === 'open') {
                toast({
                    title: 'Projeto já pago',
                    description: 'Este projeto já foi publicado.'
                });
                navigate('/creator/dashboard'); // Ou para detalhes do projeto
                return;
            }

            // Check for test account
            const { data: userData } = await supabase
                .from('users')
                .select('is_test_account, email')
                .eq('id', user.id)
                .single();

            const userEmail = (user.email || user.user_metadata?.email || '').toLowerCase().trim();
            const isHardcodedTestUser = ['creatorfull@frameup.com', 'editorfull@frameup.com'].includes(userEmail);

            if (userData?.is_test_account || isHardcodedTestUser) {
                setIsTestAccount(true);
                setProject(projectData);
                setLoading(false);
                return;
            }

            setProject(projectData);

            try {
                // 2. Criar Payment Intent via Edge Function
                const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                    body: {
                        project_id: projectData.id,
                        amount: projectData.total_paid_by_creator,
                        creator_id: user.id,
                        editor_receives: projectData.base_price // Ou outro valor calculado
                    }
                });

                if (error) throw error;

                if (data?.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    throw new Error('Falha ao obter segredo do pagamento');
                }

            } catch (err: any) {
                console.error('Erro ao iniciar pagamento:', err);
                toast({
                    variant: 'destructive',
                    title: 'Erro no pagamento',
                    description: err.message || 'Não foi possível iniciar o pagamento.'
                });
            } finally {
                setLoading(false);
            }
        }

        initialize();
    }, [id, user, navigate, toast]);

    if (loading) {
        return (
            <DashboardLayout userType="creator" title="Carregando..." subtitle="Preparando pagamento">
                <div className="max-w-4xl mx-auto space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project || (!clientSecret && !isTestAccount)) return null;

    const options = clientSecret ? {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#2563EB',
            }
        }
    } : undefined;

    return (
        <DashboardLayout
            userType="creator"
            title="Pagamento"
            subtitle="Finalize o pagamento para publicar seu projeto"
        >
            <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Esquerda: Stripe Checkout */}
                    <div className="lg:col-span-2">
                        <Card className="p-6">
                            <h2 className="text-xl font-semibold mb-6">
                                Informações de Pagamento
                            </h2>

                            {isTestAccount ? (
                                <div className="space-y-4">
                                    <div className="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-3">
                                        <span className="text-2xl">🧪</span>
                                        <div>
                                            <h3 className="font-bold">Modo de Teste Ativo</h3>
                                            <p className="text-sm">Você pode publicar este projeto sem realizar pagamento real.</p>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        size="lg"
                                        onClick={handleTestPayment}
                                        disabled={loading}
                                    >
                                        {loading ? 'Processando...' : 'Confirmar Publicação (Bypass)'}
                                    </Button>
                                </div>
                            ) : (
                                options && (
                                    <Elements stripe={stripePromise} options={options}>
                                        <CheckoutForm
                                            projectId={project.id}
                                            amount={project.total_paid_by_creator}
                                        />
                                    </Elements>
                                )
                            )}
                        </Card>
                    </div>

                    {/* Direita: Resumo */}
                    <div className="lg:col-span-1">
                        {/* Reutilizando PaymentSummaryCard mas sem a ação de pagar, apenas visualização */}
                        <div className="sticky top-24">
                            <Card className="p-6 border-primary/20 shadow-lg bg-muted/20">
                                <h3 className="text-lg font-semibold mb-4">Resumo do Pedido</h3>
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Projeto</span>
                                        <span className="font-medium truncate max-w-[150px]">{project.title}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total a pagar</span>
                                        <span className="font-bold text-primary">R$ {project.total_paid_by_creator.toFixed(2)}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
