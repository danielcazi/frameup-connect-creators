import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProjectDetailsCard } from '@/components/creator/ProjectDetailsCard';
import { PaymentSummaryCard } from '@/components/creator/PaymentSummaryCard';
import { PaymentModal } from '@/components/creator/PaymentModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    useEffect(() => {
        async function fetchProject() {
            if (!user || !id) return;

            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select(`
            *,
            pricing:pricing_table(*)
          `)
                    .eq('id', id)
                    .eq('creator_id', user.id)
                    .single();

                if (error) throw error;

                if (!data) {
                    throw new Error('Projeto não encontrado');
                }

                setProject(data);
            } catch (error: any) {
                console.error('Erro ao buscar projeto:', error);
                toast({
                    variant: 'destructive',
                    title: 'Erro',
                    description: 'Não foi possível carregar o projeto.'
                });
                navigate('/creator/dashboard');
            } finally {
                setLoading(false);
            }
        }

        fetchProject();
    }, [id, user, navigate, toast]);

    const handlePayment = async (projectId: string) => {
        if (!project) return;

        try {
            // Call Edge Function to create Payment Intent
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    project_id: project.id,
                    amount: project.total_paid_by_creator,
                    creator_id: user?.id,
                    editor_receives: project.editor_receives
                }
            });

            if (error) throw error;

            if (data?.clientSecret) {
                setClientSecret(data.clientSecret);
                setIsPaymentModalOpen(true);
            } else {
                throw new Error('Falha ao iniciar pagamento');
            }

        } catch (error: any) {
            console.error('Erro no pagamento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao iniciar pagamento',
                description: error.message || 'Tente novamente mais tarde.',
            });
        }
    };

    const handlePaymentSuccess = async () => {
        setIsPaymentModalOpen(false);

        // Optimistically update UI or redirect
        toast({
            title: 'Pagamento realizado com sucesso!',
            description: 'Seu projeto foi publicado e está visível para editores.',
        });

        // Update project status in DB (although webhook should handle this, good to do it client side for immediate feedback if safe/allowed, or just rely on webhook and redirect)
        // For now, we redirect to dashboard
        navigate('/creator/dashboard');
    };

    if (loading) {
        return (
            <DashboardLayout
                userType="creator"
                title="Carregando..."
                subtitle="Aguarde enquanto carregamos os detalhes"
            >
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        <Skeleton className="h-12 w-3/4" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!project) return null;

    return (
        <DashboardLayout
            userType="creator"
            title="Revisar e Pagar"
            subtitle="Confira os detalhes antes de publicar seu projeto"
        >
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna Esquerda: Detalhes do Projeto */}
                    <div className="lg:col-span-2 animate-fade-in">
                        <ProjectDetailsCard project={project} />
                    </div>

                    {/* Coluna Direita: Resumo de Pagamento */}
                    <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        <PaymentSummaryCard
                            project={project}
                            onPayment={handlePayment}
                        />
                    </div>
                </div>
            </div>

            {clientSecret && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onOpenChange={setIsPaymentModalOpen}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </DashboardLayout>
    );
}
