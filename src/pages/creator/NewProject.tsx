import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProgressSteps } from '@/components/creator/ProgressSteps';
import { VideoTypeCard } from '@/components/creator/VideoTypeCard';
import { EditingStyleCard } from '@/components/creator/EditingStyleCard';
import { DurationCard } from '@/components/creator/DurationCard';
import { PricingSummaryCard } from '@/components/creator/PricingSummaryCard';
import { Button } from '@/components/ui/button';
import Input from '@/components/common/Input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useProjectPricing } from '@/hooks/useProjectPricing';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'lucide-react';

type VideoType = 'reels' | 'motion' | 'youtube';
type EditingStyle = 'lofi' | 'dynamic' | 'pro' | 'motion';
type DurationCategory = '30s' | '1m' | '2m' | '5m';

interface ProjectData {
  // Passo 1
  video_type: VideoType | null;
  editing_style: EditingStyle | null;
  duration_category: DurationCategory | null;
  
  // Passo 2 (próximo prompt)
  title: string;
  description: string;
  reference_files_url: string;
  context_description: string;
  reference_links: string;
  
  // Calculados
  pricing_id: string | null;
  base_price: number;
  platform_fee: number;
  total_paid_by_creator: number;
  estimated_delivery_days: number;
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function NewProject() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projectData, setProjectData] = useState<ProjectData>({
    video_type: null,
    editing_style: null,
    duration_category: null,
    title: '',
    description: '',
    reference_files_url: '',
    context_description: '',
    reference_links: '',
    pricing_id: null,
    base_price: 0,
    platform_fee: 0,
    total_paid_by_creator: 0,
    estimated_delivery_days: 0
  });

  // Calcular preço automaticamente
  const pricing = useProjectPricing(
    projectData.video_type,
    projectData.editing_style,
    projectData.duration_category
  );

  // Atualizar projectData quando pricing mudar
  useEffect(() => {
    if (pricing.base_price > 0) {
      setProjectData(prev => ({
        ...prev,
        pricing_id: pricing.pricing_id,
        base_price: pricing.base_price,
        platform_fee: pricing.platform_fee,
        total_paid_by_creator: pricing.total_paid_by_creator,
        estimated_delivery_days: pricing.estimated_delivery_days
      }));
    }
  }, [pricing]);

  // Mostrar erro de pricing
  useEffect(() => {
    if (pricing.error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao calcular preço',
        description: pricing.error
      });
    }
  }, [pricing.error, toast]);

  const updateProjectData = (updates: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...updates }));
  };

  const canProceedStep1 = projectData.video_type && 
                          projectData.editing_style && 
                          projectData.duration_category &&
                          pricing.base_price > 0 &&
                          !pricing.loading &&
                          !pricing.error;

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!projectData.title || projectData.title.length < 5) {
      newErrors.title = 'Título deve ter no mínimo 5 caracteres';
    }
    
    if (!projectData.description || projectData.description.length < 50) {
      newErrors.description = 'Descrição deve ter no mínimo 50 caracteres';
    }
    
    if (!projectData.reference_files_url) {
      newErrors.reference_files_url = 'Link para materiais é obrigatório';
    } else if (!isValidUrl(projectData.reference_files_url)) {
      newErrors.reference_files_url = 'URL inválida';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!canProceedStep1) {
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (validateStep2()) {
      // TODO: Navigate to payment or save project
      toast({
        title: 'Projeto criado!',
        description: 'Redirecionando para pagamento...'
      });
      // navigate('/creator/project/payment');
    }
  };

  return (
    <DashboardLayout
      userType="creator"
      title="Criar Novo Projeto"
      subtitle={`Passo ${step} de 2: ${step === 1 ? 'Escolha o tipo de vídeo' : 'Detalhes do projeto'}`}
    >
      <div className="max-w-4xl mx-auto">
        <ProgressSteps currentStep={step} totalSteps={2} />
        
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8 animate-fade-in">
              {/* Tipo de Vídeo */}
              <section>
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                1. Escolha o Tipo de Vídeo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <VideoTypeCard
                  type="reels"
                  icon="📱"
                  title="Reels / Shorts"
                  description="Vídeos curtos para Instagram, TikTok, YouTube Shorts"
                  selected={projectData.video_type === 'reels'}
                  onClick={() => updateProjectData({ video_type: 'reels' })}
                />
                
                <VideoTypeCard
                  type="motion"
                  icon="🎨"
                  title="Motion Design"
                  description="Animações gráficas e motion graphics profissionais"
                  selected={projectData.video_type === 'motion'}
                  onClick={() => updateProjectData({ video_type: 'motion' })}
                />
                
                <VideoTypeCard
                  type="youtube"
                  icon="📹"
                  title="YouTube"
                  description="Vlogs, tutoriais e conteúdo longo"
                  selected={projectData.video_type === 'youtube'}
                  onClick={() => updateProjectData({ video_type: 'youtube' })}
                />
              </div>
            </section>
            
            {/* Estilo de Edição */}
            {projectData.video_type && (
              <section className="animate-fade-in">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  2. Escolha o Estilo de Edição
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <EditingStyleCard
                    style="lofi"
                    icon="📺"
                    title="Lo-fi Simples"
                    description="Cortes básicos, legendas simples e trilha sonora"
                    features={['Cortes básicos', 'Legendas simples', 'Trilha sonora']}
                    selected={projectData.editing_style === 'lofi'}
                    onClick={() => updateProjectData({ editing_style: 'lofi' })}
                  />
                  
                  <EditingStyleCard
                    style="dynamic"
                    icon="⚡"
                    title="Edição Dinâmica"
                    description="Cortes rápidos e animações de texto"
                    features={['Cortes dinâmicos', 'Animações de texto', 'Sincronização musical']}
                    selected={projectData.editing_style === 'dynamic'}
                    onClick={() => updateProjectData({ editing_style: 'dynamic' })}
                  />
                  
                  <EditingStyleCard
                    style="pro"
                    icon="🎬"
                    title="Reels PRO"
                    description="B-roll, textos dinâmicos, cenas de apoio"
                    features={['B-roll profissional', 'Textos dinâmicos', 'Color grading']}
                    selected={projectData.editing_style === 'pro'}
                    onClick={() => updateProjectData({ editing_style: 'pro' })}
                  />
                  
                  <EditingStyleCard
                    style="motion"
                    icon="🎨"
                    title="Motion Design"
                    description="Animações completas e telas personalizadas"
                    features={['Motion graphics', 'Animações 2D', 'Telas personalizadas']}
                    selected={projectData.editing_style === 'motion'}
                    onClick={() => updateProjectData({ editing_style: 'motion' })}
                  />
                </div>
              </section>
            )}
            
            {/* Duração */}
            {projectData.video_type && projectData.editing_style && (
              <section className="animate-fade-in">
                <h3 className="text-lg font-semibold mb-4 text-foreground">
                  3. Duração do Vídeo Final
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DurationCard
                    duration="30s"
                    label="30 segundos"
                    selected={projectData.duration_category === '30s'}
                    onClick={() => updateProjectData({ duration_category: '30s' })}
                  />
                  <DurationCard
                    duration="1m"
                    label="1 minuto"
                    selected={projectData.duration_category === '1m'}
                    onClick={() => updateProjectData({ duration_category: '1m' })}
                  />
                  <DurationCard
                    duration="2m"
                    label="2 minutos"
                    selected={projectData.duration_category === '2m'}
                    onClick={() => updateProjectData({ duration_category: '2m' })}
                  />
                  <DurationCard
                    duration="5m"
                    label="5 minutos"
                    selected={projectData.duration_category === '5m'}
                    onClick={() => updateProjectData({ duration_category: '5m' })}
                  />
                </div>
              </section>
            )}
            
              {/* Botões de Navegação */}
              <div className="flex justify-between pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/creator/dashboard')}
                >
                  Cancelar
                </Button>
                
                <Button
                  variant="default"
                  disabled={!canProceedStep1}
                  onClick={handleContinue}
                >
                  Continuar para Detalhes →
                </Button>
              </div>
              
              {!canProceedStep1 && (projectData.video_type || projectData.editing_style || projectData.duration_category) && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {pricing.loading ? 'Calculando preço...' : 'Complete todos os campos para continuar'}
                </p>
              )}
            </div>

            {/* Sidebar com Resumo de Preço */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <PricingSummaryCard pricing={pricing} />
              </div>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {/* Título do Projeto */}
            <div>
              <Input
                label="Título do Projeto"
                placeholder="Ex: Edição de Vlog Semanal para YouTube"
                value={projectData.title}
                onChange={(value) => updateProjectData({ title: value })}
                error={errors.title}
                required
                maxLength={100}
                showCharCount
              />
              <p className="text-xs text-muted-foreground mt-1">
                Seja claro e descritivo sobre o que você precisa
              </p>
            </div>
            
            {/* Descrição Detalhada */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Descrição Detalhada <span className="text-destructive">*</span>
              </label>
              <Textarea
                className={`min-h-[150px] ${errors.description ? 'border-destructive' : ''}`}
                placeholder="Detalhe o máximo possível sobre o que você espera do editor. Inclua informações sobre o conteúdo, estilo desejado, público-alvo, etc."
                value={projectData.description}
                onChange={(e) => updateProjectData({ description: e.target.value })}
                maxLength={2000}
              />
              <div className="flex justify-between mt-1">
                {errors.description && (
                  <span className="text-xs text-destructive">{errors.description}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {projectData.description.length}/2000
                </span>
              </div>
            </div>
            
            {/* Link para Materiais */}
            <div>
              <Input
                label="Link para os Materiais"
                type="url"
                placeholder="https://drive.google.com/..."
                value={projectData.reference_files_url}
                onChange={(value) => updateProjectData({ reference_files_url: value })}
                error={errors.reference_files_url}
                helperText="Compartilhe um link do Google Drive, Dropbox ou WeTransfer com os arquivos brutos"
                required
                icon={<Link className="w-4 h-4" />}
              />
            </div>
            
            {/* Contexto Geral (Opcional) */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Contexto Geral do Projeto
              </label>
              <Textarea
                className="min-h-[100px]"
                placeholder="Ex: Este é um canal de culinária focado em receitas rápidas. O público é jovem e engajado nas redes sociais."
                value={projectData.context_description}
                onChange={(e) => updateProjectData({ context_description: e.target.value })}
                maxLength={1000}
              />
              <span className="text-xs text-muted-foreground">
                {projectData.context_description.length}/1000
              </span>
            </div>
            
            {/* Links de Referência (Opcional) */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Links de Referência do Resultado Esperado
              </label>
              <Textarea
                className="min-h-[80px]"
                placeholder="Cole links de vídeos que você gosta do estilo de edição. Ex: https://youtube.com/watch?v=..."
                value={projectData.reference_links}
                onChange={(e) => updateProjectData({ reference_links: e.target.value })}
                maxLength={500}
              />
              <span className="text-xs text-muted-foreground">
                {projectData.reference_links.length}/500
              </span>
            </div>
            
            {/* Resumo do Projeto */}
            <Card className="bg-muted/50 p-6">
              <h3 className="text-lg font-semibold mb-4 text-foreground">Resumo do Projeto</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-semibold text-foreground capitalize">
                    {projectData.video_type?.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estilo:</span>
                  <span className="font-semibold text-foreground capitalize">
                    {projectData.editing_style?.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-semibold text-foreground">
                    {projectData.duration_category}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo estimado:</span>
                  <span className="font-semibold text-foreground">
                    {projectData.estimated_delivery_days} dias úteis
                  </span>
                </div>
                
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-semibold text-lg text-foreground">Valor Total:</span>
                  <span className="font-bold text-2xl text-primary">
                    R$ {projectData.total_paid_by_creator.toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
            
            {/* Botões de Navegação */}
            <div className="flex justify-between pt-6 border-t border-border">
              <Button variant="outline" onClick={handleBack}>
                ← Voltar
              </Button>
              
              <Button variant="default" onClick={handleSubmit}>
                Ir para Pagamento →
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
