import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProgressSteps } from '@/components/creator/ProgressSteps';
import { VideoTypeCard } from '@/components/creator/VideoTypeCard';
import { EditingStyleCard } from '@/components/creator/EditingStyleCard';
import { DurationCard } from '@/components/creator/DurationCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProjectPricing } from '@/hooks/useProjectPricing';
import { PricingSummaryCard } from '@/components/creator/PricingSummaryCard';
import { Step2Details } from '@/components/creator/Step2Details';
import { useAuth } from '@/contexts/AuthContext';
import { saveProjectDraft } from '@/lib/projects';
import { RefreshCw, User, Star, X } from 'lucide-react';
import { useWorkedEditors } from '@/hooks/useRehire';
import { createRehireProject, WorkedEditor, formatProjectsCount } from '@/services/rehireService';
import EditorSelectorModal from '@/components/rehire/EditorSelectorModal';
import { isDemoUser, publishProjectAsDemo } from '@/lib/demo';

type VideoType = 'reels' | 'motion' | 'youtube';
type EditingStyle = 'lofi' | 'dynamic' | 'pro' | 'motion';
type DurationCategory = '30s' | '1m' | '2m' | '5m';

interface ProjectData {
  // Passo 1
  video_type: VideoType | null;
  editing_style: EditingStyle | null;
  duration_category: DurationCategory | null;

  // Passo 2
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

export default function NewProject() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
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

  // Rehire State
  const { editors: workedEditors, hasWorkedWithEditors } = useWorkedEditors();
  const [selectedEditor, setSelectedEditor] = useState<WorkedEditor | null>(null);
  const [rehireMessage, setRehireMessage] = useState('');
  const [showEditorSelector, setShowEditorSelector] = useState(false);

  // Check for pre-selected editor from navigation
  useEffect(() => {
    if (location.state?.rehireEditorId && workedEditors.length > 0) {
      const editor = workedEditors.find(e => e.editor_id === location.state.rehireEditorId);
      if (editor) {
        setSelectedEditor(editor);
      }
    }
  }, [location.state, workedEditors]);

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
    } else if (pricing.error) {
      // Reset pricing data on error
      setProjectData(prev => ({
        ...prev,
        pricing_id: null,
        base_price: 0,
        platform_fee: 0,
        total_paid_by_creator: 0,
        estimated_delivery_days: 0
      }));
    }
  }, [pricing]);

  // Tratamento de erros
  useEffect(() => {
    if (pricing.error) {
      toast({
        variant: 'destructive',
        title: 'Erro no cálculo',
        description: pricing.error,
        duration: 5000
      });
    }
  }, [pricing.error, toast]);

  const updateProjectData = (updates: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...updates }));
  };

  const canProceedStep1 = projectData.video_type &&
    projectData.editing_style &&
    projectData.duration_category &&
    projectData.base_price > 0 &&
    !pricing.loading;

  const handleContinue = () => {
    if (!canProceedStep1) {
      return;
    }
    setStep(2);
  };

  const handleCreateProject = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para criar um projeto.',
      });
      return;
    }

    setSaving(true);

    try {
      if (selectedEditor) {
        // Create Rehire Project
        const projectId = await createRehireProject(user.id, {
          editorId: selectedEditor.editor_id,
          title: projectData.title,
          description: projectData.description,
          videoType: projectData.video_type!,
          editingStyle: projectData.editing_style!,
          durationCategory: projectData.duration_category!,
          basePrice: pricing.base_price,
          platformFee: pricing.platform_fee,
          totalPrice: pricing.total_paid_by_creator,
          deadlineDays: projectData.estimated_delivery_days,
          referenceFilesUrl: projectData.reference_files_url,
          contextDescription: projectData.context_description,
          rehireMessage: rehireMessage || undefined,
        });

        toast({
          title: 'Proposta enviada!',
          description: `${selectedEditor.editor_name} receberá sua proposta de recontratação.`,
        });

        navigate(`/creator/project/${projectId}`);
      } else {
        // Normal Project Creation
        // 1. Salvar projeto como draft
        const result = await saveProjectDraft(projectData as any, user.id);

        if (!result.success) {
          throw new Error(result.error);
        }

        // 2. Verificar se é usuário demo (bypass de pagamento)
        const isDemo = await isDemoUser(user.id);

        if (isDemo) {
          // Demo user: publicar projeto diretamente sem pagamento
          const published = await publishProjectAsDemo(result.project.id);

          if (published) {
            toast({
              title: '🎉 Projeto publicado!',
              description: 'Modo demo: projeto publicado sem pagamento.',
            });
            navigate('/creator/dashboard');
          } else {
            throw new Error('Erro ao publicar projeto no modo demo');
          }
        } else {
          // Usuário normal: redirecionar para página de pagamento Stripe
          toast({
            title: 'Projeto salvo!',
            description: 'Redirecionando para revisão e pagamento...',
          });

          setTimeout(() => {
            navigate(`/creator/project/${result.project.id}/payment`);
          }, 1500);
        }
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar projeto',
        description: error.message || 'Tente novamente mais tarde.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      userType="creator"
      title="Criar Novo Projeto"
      subtitle={`Passo ${step} de 2: ${step === 1 ? 'Escolha o tipo de vídeo' : 'Detalhes do projeto'}`}
    >
      <div className="max-w-6xl mx-auto">
        <ProgressSteps currentStep={step} totalSteps={2} />

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-8">

              {/* Seção de Recontratação */}
              {hasWorkedWithEditors && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Recontratar Editor</h2>
                        <p className="text-sm text-gray-500">
                          Trabalhe novamente com alguém que você já conhece
                        </p>
                      </div>
                    </div>

                    {!selectedEditor && (
                      <button
                        onClick={() => setShowEditorSelector(true)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                      >
                        Selecionar editor
                      </button>
                    )}
                  </div>

                  {/* Editor Selecionado */}
                  {selectedEditor && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {selectedEditor.editor_photo ? (
                            <img
                              src={selectedEditor.editor_photo}
                              alt={selectedEditor.editor_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{selectedEditor.editor_name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              {selectedEditor.editor_rating > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                  {selectedEditor.editor_rating.toFixed(1)}
                                </span>
                              )}
                              <span>•</span>
                              <span>{formatProjectsCount(selectedEditor.projects_together)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedEditor(null)}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>

                      {/* Mensagem personalizada */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Mensagem para o editor (opcional)
                        </label>
                        <textarea
                          value={rehireMessage}
                          onChange={(e) => setRehireMessage(e.target.value)}
                          placeholder="Ex: Gostei muito do último trabalho! Tenho um novo projeto similar..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                        />
                      </div>

                      <p className="mt-3 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                        💡 Ao criar o projeto, {selectedEditor.editor_name} receberá sua proposta e poderá aceitar ou recusar.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                  {pricing.loading ? 'Calculando...' : 'Continuar para Detalhes →'}
                </Button>
              </div>

              {!canProceedStep1 && (projectData.video_type || projectData.editing_style || projectData.duration_category) && !pricing.loading && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {pricing.error ? 'Corrija as opções para continuar' : 'Complete todos os campos para continuar'}
                </p>
              )}
            </div>

            {/* Coluna Lateral - Resumo de Preço */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <PricingSummaryCard pricing={pricing} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <Step2Details
            data={projectData as any} // Type assertion needed because ProjectData in Step2Details is slightly different (string vs literal types)
            onChange={updateProjectData}
            onBack={() => setStep(1)}
            onSubmit={handleCreateProject}
          />
        )}

        {/* Modal de Seleção de Editor */}
        {showEditorSelector && (
          <EditorSelectorModal
            editors={workedEditors}
            onSelect={(editor) => {
              setSelectedEditor(editor);
              setShowEditorSelector(false);
            }}
            onClose={() => setShowEditorSelector(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
