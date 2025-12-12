import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ProgressSteps } from '@/components/creator/ProgressSteps';
import { VideoTypeCard } from '@/components/creator/VideoTypeCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProjectPricing } from '@/hooks/useProjectPricing';
import { useDynamicDurations } from '@/hooks/useDynamicDurations';
import { useAvailableStyles } from '@/hooks/useAvailableStyles';
import { DynamicDurationSelector } from '@/components/creator/DynamicDurationSelector';
import { DynamicStyleSelector } from '@/components/creator/DynamicStyleSelector';
import { FEATURES_BY_STYLE } from '@/services/pricingService';
import {
  BatchQuantitySelector,
  BatchVideosDetail,
  ProjectMaterialSection
} from '@/components/batch';
import {
  BatchVideoCreate,
  BatchDeliveryMode,
  RawFootageDuration,
  calculateBatchPricing
} from '@/types';
import { ProjectSummaryCard } from '@/components/creator/ProjectSummaryCard'; // Changed from PricingSummaryCard
import { Step2Details } from '@/components/creator/Step2Details';
import { useAuth } from '@/contexts/AuthContext';
import { saveProjectDraft } from '@/lib/projects';
import {
  RefreshCw,
  User,
  Star,
  X,
  FolderOpen,
  Film,
  Palette,
  Type,
  Music,
  ExternalLink,
  Info
} from 'lucide-react';
import { useWorkedEditors } from '@/hooks/useRehire';
import { createRehireProject, WorkedEditor, formatProjectsCount } from '@/services/rehireService';
import { createBatchProject } from '@/services/batchProjectService';
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

  // NOVOS CAMPOS - Lote
  is_batch: boolean;
  batch_quantity: number;
  batch_delivery_mode: BatchDeliveryMode;
  batch_discount_percent: number;

  // NOVOS CAMPOS - Briefing Aprimorado
  raw_footage_url: string;
  raw_footage_duration: RawFootageDuration | '';
  brand_identity_url: string;
  fonts_url: string;
  music_sfx_url: string;

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

    // NOVOS CAMPOS
    is_batch: false,
    batch_quantity: 1,
    batch_delivery_mode: 'sequential',
    batch_discount_percent: 0,
    raw_footage_url: '',
    raw_footage_duration: '',
    brand_identity_url: '',
    fonts_url: '',
    music_sfx_url: '',

    pricing_id: null,
    base_price: 0,
    platform_fee: 0,
    total_paid_by_creator: 0,
    estimated_delivery_days: 0
  });

  // Estado para os vídeos do lote
  const [batchVideos, setBatchVideos] = useState<BatchVideoCreate[]>([]);

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



  // Hook de estilos disponíveis
  const { styles: availableStyles, loading: stylesLoading } = useAvailableStyles(projectData.video_type);

  // Hook de durações dinâmicas
  const { durations: availableDurations, loading: durationsLoading } = useDynamicDurations(
    projectData.video_type,
    projectData.editing_style
  );

  const pricing = useProjectPricing(
    projectData.video_type,
    projectData.editing_style,
    projectData.duration_category
  );

  // Resetar estilo se o atual não estiver nos disponíveis
  useEffect(() => {
    if (availableStyles.length > 0 && projectData.editing_style) {
      const hasCurrentStyle = availableStyles.some(s => s.value === projectData.editing_style);
      if (!hasCurrentStyle) {
        updateProjectData({ editing_style: null });
      }
    }
  }, [availableStyles, projectData.editing_style]);

  // Resetar duração se a atual não estiver nas disponíveis (quando tipo/estilo mudar)
  useEffect(() => {
    // Verificar se a duração atual existe na lista de opções (pelo value)
    if (availableDurations.length > 0 && projectData.duration_category) {
      const hasCurrentDuration = availableDurations.some(d => d.value === projectData.duration_category);
      if (!hasCurrentDuration) {
        updateProjectData({ duration_category: null });
      }
    }
  }, [availableDurations, projectData.duration_category]);

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
    setProjectData(prev => {
      const newData = { ...prev, ...updates };

      // Se o tipo de vídeo mudou, resetar estilo e duração
      if (updates.video_type && updates.video_type !== prev.video_type) {
        newData.editing_style = null;
        newData.duration_category = null;
      }

      // Se o estilo mudou, resetar duração (pois durações variam por estilo)
      if (updates.editing_style && updates.editing_style !== prev.editing_style) {
        newData.duration_category = null;
      }

      return newData;
    });
  };

  const updateBatchFields = (updates: {
    is_batch?: boolean;
    batch_quantity?: number;
    batch_delivery_mode?: BatchDeliveryMode;
  }) => {
    setProjectData(prev => {
      const newData = { ...prev, ...updates };

      // Se mudou para lote, inicializar vídeos
      if (updates.is_batch === true && updates.batch_quantity) {
        const initialVideos: BatchVideoCreate[] = Array.from(
          { length: updates.batch_quantity },
          (_, i) => ({
            sequence_order: i + 1,
            title: '',
            specific_instructions: '',
            editor_can_choose_timing: false,
          })
        );
        setBatchVideos(initialVideos);
      }

      // Se mudou quantidade, ajustar array de vídeos
      if (updates.batch_quantity && prev.is_batch) {
        setBatchVideos(currentVideos => {
          const newVideos = [...currentVideos];
          const targetLength = updates.batch_quantity!;

          // Adicionar novos se necessário
          while (newVideos.length < targetLength) {
            newVideos.push({
              sequence_order: newVideos.length + 1,
              title: '',
              specific_instructions: '',
              editor_can_choose_timing: false,
            });
          }

          // Remover excedentes
          if (newVideos.length > targetLength) {
            newVideos.splice(targetLength);
          }

          return newVideos;
        });
      }

      // Calcular desconto baseado na quantidade
      if (updates.batch_quantity) {
        let discount = 0;
        if (updates.batch_quantity >= 10) discount = 10;
        else if (updates.batch_quantity >= 7) discount = 8;
        else if (updates.batch_quantity >= 4) discount = 5;
        newData.batch_discount_percent = discount;
      }

      // Se voltou para individual, resetar campos de lote
      if (updates.is_batch === false) {
        newData.batch_quantity = 1;
        newData.batch_delivery_mode = 'sequential';
        newData.batch_discount_percent = 0;
        setBatchVideos([]);
      }

      return newData;
    });
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

  // =====================================================
  // FUNÇÃO DE VALIDAÇÃO
  // =====================================================
  const validateBatchProject = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validações básicas (existentes)
    if (!projectData.title.trim()) errors.push('Título é obrigatório');
    if (!projectData.description.trim()) errors.push('Descrição é obrigatória');
    if (!projectData.video_type) errors.push('Tipo de vídeo é obrigatório');
    if (!projectData.editing_style) errors.push('Estilo de edição é obrigatório');
    if (!projectData.duration_category) errors.push('Duração é obrigatória');
    if (!projectData.estimated_delivery_days) errors.push('Prazo é obrigatório');

    // Validações de briefing aprimorado
    if (!projectData.raw_footage_url.trim()) {
      errors.push('Link do material bruto é obrigatório');
    }
    if (!projectData.raw_footage_duration) {
      errors.push('Duração do material bruto é obrigatória');
    }
    if (!projectData.brand_identity_url.trim()) {
      errors.push('Link da identidade visual é obrigatório');
    }
    if (!projectData.fonts_url.trim()) {
      errors.push('Fontes utilizadas é obrigatório');
    }
    if (!projectData.reference_links.trim()) {
      errors.push('Links de referência são obrigatórios');
    }

    // Validações específicas de lote
    if (projectData.is_batch) {
      if (projectData.batch_quantity < 4 || projectData.batch_quantity > 20) {
        errors.push('Quantidade de vídeos deve ser entre 4 e 20');
      }

      // Verificar se todos os vídeos têm título (se não for editor choice)
      const hasEditorChoice = batchVideos.some(v => v.editor_can_choose_timing);

      if (!hasEditorChoice) {
        const videosWithoutTitle = batchVideos.filter(v => !v.title?.trim());
        if (videosWithoutTitle.length > 0) {
          errors.push(`${videosWithoutTitle.length} vídeo(s) sem título definido`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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

    // Validar
    const validation = validateBatchProject();

    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: validation.errors[0], // Mostrar primeiro erro
      });
      return;
    }

    setSaving(true);

    try {
      if (projectData.is_batch) {
        // Usar serviço de lote
        const result = await createBatchProject(
          projectData as any,
          batchVideos,
          user.id
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        toast({
          title: '📦 Projeto em lote criado!',
          description: `${projectData.batch_quantity} vídeos configurados com sucesso.`,
        });

        // Redirecionar para pagamento
        // Corrigido para verificar se result.project existe
        if (result.project) {
          navigate(`/creator/project/${result.project.id}/payment`);
        } else {
          throw new Error('Projeto criado mas ID não retornado.');
        }

      } else if (selectedEditor) {
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

              {/* ========================================= */}
              {/* 🆕 NOVA SEÇÃO: Quantidade de Vídeos (PRIMEIRO!) */}
              {/* ========================================= */}
              <section className="bg-white dark:bg-card rounded-xl border-2 border-primary/20 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  Quer criar quantos vídeos?
                </h3>

                {/* Seletor Individual vs Lote */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opção Individual */}
                  <button
                    type="button"
                    onClick={() => updateBatchFields({ is_batch: false, batch_quantity: 1 })}
                    className={`border-2 rounded-xl p-6 transition-all text-left ${!projectData.is_batch
                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/50 bg-card'
                      }`}
                  >
                    <div className="text-4xl mb-3">📹</div>
                    <div className="font-semibold text-lg text-foreground">Projeto Individual</div>
                    <div className="text-sm text-muted-foreground mt-1">1 vídeo único</div>
                  </button>

                  {/* Opção Lote */}
                  <button
                    type="button"
                    onClick={() => updateBatchFields({
                      is_batch: true,
                      batch_quantity: 4,
                      batch_delivery_mode: 'sequential'
                    })}
                    className={`border-2 rounded-xl p-6 transition-all text-left ${projectData.is_batch
                      ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/50 bg-card'
                      }`}
                  >
                    <div className="text-4xl mb-3">📦</div>
                    <div className="font-semibold text-lg text-foreground">Projeto em Lote</div>
                    <div className="text-sm text-muted-foreground mt-1">4 a 20 vídeos</div>
                    <div className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                      💰 Até 10% OFF
                    </div>
                  </button>
                </div>

                {/* Configurações do Lote (expande se selecionado) */}
                {projectData.is_batch && (
                  <div className="mt-6 border-t border-border pt-6 space-y-5 animate-fade-in">

                    {/* Quantidade */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-foreground">
                        Quantos vídeos você precisa?
                      </label>
                      <div className="flex items-center gap-4 flex-wrap">
                        <input
                          type="number"
                          min={4}
                          max={20}
                          value={projectData.batch_quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 4 && val <= 20) {
                              updateBatchFields({ batch_quantity: val });
                            }
                          }}
                          className="w-24 px-4 py-2 border-2 border-input rounded-lg text-center text-lg font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                        />
                        <span className="text-muted-foreground">vídeos</span>

                        {projectData.batch_discount_percent > 0 && (
                          <div className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                            🎉 {projectData.batch_discount_percent}% de desconto
                          </div>
                        )}
                      </div>

                      {/* Escala de descontos */}
                      <div className="mt-3 flex gap-2 text-xs flex-wrap">
                        <span className={`px-2 py-1 rounded ${projectData.batch_quantity >= 4 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          4-6: 5% OFF
                        </span>
                        <span className={`px-2 py-1 rounded ${projectData.batch_quantity >= 7 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          7-9: 8% OFF
                        </span>
                        <span className={`px-2 py-1 rounded ${projectData.batch_quantity >= 10 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          10+: 10% OFF
                        </span>
                      </div>
                    </div>

                    {/* Modo de Entrega */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-foreground">
                        Como deseja receber os vídeos?
                      </label>

                      <div className="space-y-3">
                        {/* Sequencial */}
                        <label
                          className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${projectData.batch_delivery_mode === 'sequential'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                            }`}
                        >
                          <input
                            type="radio"
                            name="delivery_mode"
                            value="sequential"
                            checked={projectData.batch_delivery_mode === 'sequential'}
                            onChange={() => updateBatchFields({ batch_delivery_mode: 'sequential' })}
                            className="mt-1 accent-primary"
                          />
                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2 text-foreground">
                              📅 Entregas Sequenciais
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Recomendado
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Editor entrega 1 vídeo por vez. Você aprova e ele passa para o próximo.
                            </div>
                          </div>
                        </label>

                        {/* Simultâneo */}
                        <label
                          className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${projectData.batch_delivery_mode === 'simultaneous'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-border hover:bg-muted/50'
                            }`}
                        >
                          <input
                            type="radio"
                            name="delivery_mode"
                            value="simultaneous"
                            checked={projectData.batch_delivery_mode === 'simultaneous'}
                            onChange={() => updateBatchFields({ batch_delivery_mode: 'simultaneous' })}
                            className="mt-1 accent-amber-500"
                          />
                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2 text-foreground">
                              ⚡ Entrega Simultânea
                              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                +20%
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Editor entrega todos os {projectData.batch_quantity} vídeos juntos.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Tipo de Vídeo */}
              <section>
                <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
                  <span className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  Escolha o Tipo de Vídeo
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

              {/* Seção: Estilo de Edição (DINÂMICO) */}
              {projectData.video_type && (
                <section className="animate-fade-in">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </span>
                    Estilo de Edição
                  </h3>
                  <DynamicStyleSelector
                    videoType={projectData.video_type}
                    selectedStyle={projectData.editing_style}
                    onSelect={(style) => updateProjectData({ editing_style: style as any })}
                  />
                </section>
              )}

              {/* Seção: Duração do Vídeo (DINÂMICO) */}
              {projectData.video_type && projectData.editing_style && (
                <section className="animate-fade-in">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </span>
                    Duração do Vídeo Final
                  </h3>
                  <DynamicDurationSelector
                    videoType={projectData.video_type}
                    editingStyle={projectData.editing_style}
                    selectedDuration={projectData.duration_category}
                    onSelect={(duration) => updateProjectData({ duration_category: duration as any })}
                  />
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
                <ProjectSummaryCard
                  projectData={projectData}
                  pricing={pricing}
                  isBatch={projectData.is_batch}
                  batchQuantity={projectData.batch_quantity}
                  batchDiscount={projectData.batch_discount_percent}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-8">

              <Step2Details
                data={projectData as any}
                onChange={updateProjectData}
                onBack={() => setStep(1)}
                onSubmit={handleCreateProject}
                saving={saving}
              />

              {/* ========================================= */}
              {/* 🆕 NOVA SEÇÃO: Material do Projeto */}
              {/* ========================================= */}
              <section className="space-y-5 border-t-2 border-border pt-6 mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      📋 Material do Projeto
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Links para os arquivos que o editor vai precisar
                    </p>
                  </div>
                </div>

                {/* Material Bruto */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Film className="w-4 h-4 text-primary" />
                    Link do Material Bruto (Drive/WeTransfer) *
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={projectData.raw_footage_url}
                    onChange={(e) => updateProjectData({ raw_footage_url: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Certifique-se que o link está público ou com permissão de visualização
                  </p>
                </div>

                {/* Duração do Material Bruto */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">
                    Duração Total do Material Bruto *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: '0-30min', label: '0-30 min', icon: '⚡' },
                      { value: '30min-1h', label: '30min - 1h', icon: '📹' },
                      { value: '1-3h', label: '1-3 horas', icon: '🎙️' },
                      { value: '3h+', label: '3+ horas', icon: '🎬' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateProjectData({ raw_footage_duration: option.value as RawFootageDuration })}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${projectData.raw_footage_duration === option.value
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/50 bg-card'
                          }`}
                      >
                        <div className="text-2xl mb-1">{option.icon}</div>
                        <div className="text-xs font-medium text-foreground">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Identidade Visual */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Palette className="w-4 h-4 text-primary" />
                    Identidade Visual / Brandkit (Drive) *
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... (pasta com logo, cores, templates)"
                    value={projectData.brand_identity_url}
                    onChange={(e) => updateProjectData({ brand_identity_url: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                  />
                </div>

                {/* Fontes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Type className="w-4 h-4 text-primary" />
                    Fontes Utilizadas *
                  </label>
                  <input
                    type="text"
                    placeholder="Link do Drive ou nomes das fontes (ex: Montserrat Bold, Inter)"
                    value={projectData.fonts_url}
                    onChange={(e) => updateProjectData({ fonts_url: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                  />
                </div>

                {/* Música/SFX (Opcional) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Music className="w-4 h-4 text-primary" />
                    Música/Efeitos Sonoros (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... (deixe vazio se editor pode escolher)"
                    value={projectData.music_sfx_url}
                    onChange={(e) => updateProjectData({ music_sfx_url: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                  />
                </div>

                {/* Referências (já existe, mas garantir que está aqui) */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Links de Referência *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Cole links de vídeos que inspiram o estilo desejado..."
                    value={projectData.reference_links}
                    onChange={(e) => updateProjectData({ reference_links: e.target.value })}
                    required
                    className="w-full px-4 py-3 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background resize-none"
                  />
                </div>
              </section>

              {/* ========================================= */}
              {/* 🆕 SEÇÃO CONDICIONAL: Detalhamento dos Vídeos (SE FOR LOTE) */}
              {/* ========================================= */}
              {projectData.is_batch && (
                <BatchVideosDetail
                  quantity={projectData.batch_quantity}
                  videos={batchVideos}
                  onUpdate={setBatchVideos}
                  rawFootageDuration={projectData.raw_footage_duration as RawFootageDuration}
                />
              )}

            </div>

            {/* Sidebar de Resumo atualizada */}
            <div className="lg:col-span-1">
              <ProjectSummaryCard
                projectData={projectData}
                isBatch={projectData.is_batch}
                batchQuantity={projectData.batch_quantity}
                batchDiscount={projectData.batch_discount_percent}
                batchVideos={batchVideos}
              />
            </div>
          </div>
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
