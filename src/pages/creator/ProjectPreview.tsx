import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Link as LinkIcon } from 'lucide-react';

interface Project {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  video_type: string;
  editing_style: string;
  duration_category: string;
  reference_files_url: string;
  context_description: string | null;
  reference_links: string | null;
  base_price: number;
  platform_fee: number;
  total_paid_by_creator: number;
  estimated_delivery_days: number;
  status: string;
  payment_status: string;
  pricing?: {
    features: string[];
  };
}

function ProjectDetailsCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-foreground">{project.title}</h2>
      
      <div className="space-y-6">
        {/* Tipo e Configurações */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Configurações</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Tipo de Vídeo</span>
              <p className="font-semibold text-foreground capitalize">{project.video_type}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Estilo de Edição</span>
              <p className="font-semibold text-foreground capitalize">{project.editing_style}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Duração</span>
              <p className="font-semibold text-foreground">{project.duration_category}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Prazo Estimado</span>
              <p className="font-semibold text-foreground">{project.estimated_delivery_days} dias</p>
            </div>
          </div>
        </section>
        
        {/* Descrição */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Descrição</h3>
          <p className="text-foreground whitespace-pre-line">{project.description}</p>
        </section>
        
        {/* Materiais */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Materiais</h3>
          <a 
            href={project.reference_files_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4" />
            Acessar arquivos
          </a>
        </section>
        
        {/* Contexto (se houver) */}
        {project.context_description && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Contexto</h3>
            <p className="text-foreground">{project.context_description}</p>
          </section>
        )}
        
        {/* Referências (se houver) */}
        {project.reference_links && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Referências</h3>
            <p className="text-foreground whitespace-pre-line">{project.reference_links}</p>
          </section>
        )}
        
        {/* Features Incluídas */}
        {project.pricing?.features && project.pricing.features.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Incluído no Pacote</h3>
            <ul className="space-y-2">
              {project.pricing.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-green-500">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      
      {/* Botão Editar */}
      <div className="mt-6 pt-6 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate(`/creator/project/${project.id}/edit`)}
        >
          ✏️ Editar Projeto
        </Button>
      </div>
    </Card>
  );
}

function PaymentSummaryCard({ 
  project, 
  onPayment 
}: { 
  project: Project; 
  onPayment: (projectId: string) => Promise<void>;
}) {
  const [processing, setProcessing] = useState(false);
  
  const handlePayment = async () => {
    setProcessing(true);
    try {
      await onPayment(project.id);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="sticky top-24">
      <Card className="p-6 bg-accent/10">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Resumo do Pagamento</h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Edição base</span>
            <span className="font-semibold text-foreground">
              R$ {project.base_price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa da plataforma (5%)</span>
            <span className="font-semibold text-foreground">
              R$ {project.platform_fee.toFixed(2)}
            </span>
          </div>
          
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-bold text-foreground">TOTAL</span>
            <span className="font-bold text-2xl text-primary">
              R$ {project.total_paid_by_creator.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="p-4 bg-primary/10 rounded-lg mb-6">
          <div className="flex items-start gap-2">
            <span className="text-primary">ℹ️</span>
            <div className="text-xs text-foreground">
              <p className="font-semibold mb-2">Como funciona:</p>
              <ul className="space-y-1">
                <li>• Seu pagamento fica retido na plataforma</li>
                <li>• Editores se candidatam ao projeto</li>
                <li>• Você escolhe o melhor editor</li>
                <li>• Pagamento liberado após sua aprovação</li>
              </ul>
            </div>
          </div>
        </div>
        
        <Button
          variant="default"
          className="w-full"
          size="lg"
          disabled={processing}
          onClick={handlePayment}
        >
          {processing ? 'Processando...' : '💳 Pagar e Publicar Projeto'}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          🔒 Pagamento 100% seguro via Stripe
        </p>
      </Card>
    </div>
  );
}

function ProjectPreviewSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card className="p-6">
          <Skeleton className="h-8 w-3/4 mb-6" />
          <div className="space-y-6">
            <div>
              <Skeleton className="h-4 w-24 mb-3" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user?.id) {
      return;
    }

    async function fetchProject() {
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
          toast({
            variant: 'destructive',
            title: 'Projeto não encontrado',
            description: 'O projeto solicitado não existe ou você não tem permissão para visualizá-lo.'
          });
          navigate('/creator/dashboard');
          return;
        }
        
        // Validar status
        if (data.status !== 'draft' || data.payment_status !== 'pending') {
          toast({
            variant: 'destructive',
            title: 'Projeto inválido',
            description: 'Este projeto já foi pago ou não está mais disponível para pagamento.'
          });
          navigate('/creator/dashboard');
          return;
        }
        
        setProject(data);
      } catch (error: any) {
        console.error('Erro ao buscar projeto:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar projeto',
          description: error.message || 'Não foi possível carregar o projeto. Tente novamente.'
        });
        navigate('/creator/dashboard');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [id, user, navigate, toast]);

  const handlePayment = async (projectId: string) => {
    navigate(`/creator/project/${projectId}/payment`);
  };

  if (loading) {
    return (
      <DashboardLayout
        userType="creator"
        title="Revisar e Pagar"
        subtitle="Confira os detalhes antes de publicar seu projeto"
      >
        <div className="max-w-4xl mx-auto">
          <ProjectPreviewSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <DashboardLayout
      userType="creator"
      title="Revisar e Pagar"
      subtitle="Confira os detalhes antes de publicar seu projeto"
    >
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Esquerda: Detalhes do Projeto */}
          <div className="lg:col-span-2">
            <ProjectDetailsCard project={project} />
          </div>
          
          {/* Coluna Direita: Resumo de Pagamento */}
          <div className="lg:col-span-1">
            <PaymentSummaryCard 
              project={project}
              onPayment={handlePayment}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
