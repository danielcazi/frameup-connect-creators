import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Link as LinkIcon, Loader2, FileText, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Project {
    id: string;
    title: string;
    description: string;
    context_description: string; // Updated to match DB column
    reference_links: string;
    reference_files_url: string;
    video_type: string;
    editing_style: string;
    duration_category: string; // Updated to match DB column
    deadline_days: number;
    base_price: number; // Updated to match DB column
    status: string;
    assigned_editor_id: string | null;
    creator_id: string;
}

// Mapeamento de tipos para exibição
const VIDEO_TYPE_LABELS: Record<string, string> = {
    'reels': 'Reels / Shorts',
    'motion': 'Motion Design',
    'youtube': 'YouTube',
};

const EDITING_STYLE_LABELS: Record<string, string> = {
    'lofi': 'Lo-fi Simples',
    'dynamic': 'Edição Dinâmica',
    'pro': 'Reels PRO',
    'motion': 'Motion Graphics'
};

const DURATION_LABELS: Record<string, string> = {
    '30s': '30 segundos',
    '1m': '1 minuto',
    '2m': '2 minutos',
    '5m': '5+ minutos'
};

export default function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Campos editáveis
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [context, setContext] = useState('');
    const [referenceLinks, setReferenceLinks] = useState('');
    const [referenceFilesUrl, setReferenceFilesUrl] = useState('');

    useEffect(() => {
        if (id && user) {
            loadProject();
        }
    }, [id, user]);

    const loadProject = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Verificar se é o dono do projeto
            if (data.creator_id !== user?.id) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso negado',
                    description: 'Você não tem permissão para editar este projeto.'
                });
                navigate('/creator/dashboard');
                return;
            }

            // Verificar se pode editar (sem editor atribuído)
            if (data.assigned_editor_id) {
                toast({
                    variant: 'destructive',
                    title: 'Edição bloqueada',
                    description: 'Não é possível editar o projeto após aceitar um editor.'
                });
                navigate(`/creator/project/${id}`);
                return;
            }

            // Verificar status
            if (!['draft', 'published', 'open'].includes(data.status)) {
                toast({
                    variant: 'destructive',
                    title: 'Edição bloqueada',
                    description: 'Não é possível editar projetos em andamento.'
                });
                navigate(`/creator/project/${id}`);
                return;
            }

            setProject(data);
            setTitle(data.title || '');
            setDescription(data.description || '');
            setContext(data.context_description || '');
            setReferenceLinks(data.reference_links || '');
            setReferenceFilesUrl(data.reference_files_url || '');

        } catch (error) {
            console.error('Error loading project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível carregar o projeto.'
            });
            navigate('/creator/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'O título do projeto é obrigatório.'
            });
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    title: title.trim(),
                    description: description.trim(),
                    context_description: context.trim(),
                    reference_links: referenceLinks.trim(),
                    reference_files_url: referenceFilesUrl.trim(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Projeto atualizado!',
                description: 'As alterações foram salvas com sucesso.'
            });
            navigate(`/creator/project/${id}`);

        } catch (error) {
            console.error('Error saving project:', error);
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Não foi possível salvar as alterações.'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout userType="creator" title="Editar Projeto" subtitle="Carregando...">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!project) return null;

    return (
        <DashboardLayout
            userType="creator"
            title="Editar Projeto"
            subtitle="Atualize os detalhes do seu projeto"
        >
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/creator/project/${id}`)}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar ao Projeto
                    </Button>

                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>

                {/* Informações fixas (não editáveis) */}
                <Card className="p-6 mb-6 bg-muted/30">
                    <div className="flex items-start gap-3 mb-4">
                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h3 className="font-medium text-sm">Configurações do Projeto</h3>
                            <p className="text-xs text-muted-foreground">
                                Estas configurações não podem ser alteradas pois afetam o valor do projeto.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Tipo de Vídeo</p>
                            <Badge variant="secondary">
                                {VIDEO_TYPE_LABELS[project.video_type] || project.video_type}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Estilo</p>
                            <Badge variant="secondary">
                                {EDITING_STYLE_LABELS[project.editing_style] || project.editing_style}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Duração</p>
                            <Badge variant="secondary">
                                {DURATION_LABELS[project.duration_category] || project.duration_category}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Valor</p>
                            <Badge variant="default" className="bg-green-600">
                                R$ {project.base_price?.toFixed(2)}
                            </Badge>
                        </div>
                    </div>
                </Card>

                {/* Campos editáveis */}
                <Card className="p-6">
                    <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Detalhes do Projeto
                    </h3>

                    <div className="space-y-6">
                        {/* Título */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Título do Projeto <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Vlog de viagem para Buenos Aires"
                                maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground">
                                {title.length}/100 caracteres
                            </p>
                        </div>

                        {/* Descrição */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição Detalhada</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva detalhadamente o que você espera do vídeo editado..."
                                rows={5}
                                maxLength={2000}
                            />
                            <p className="text-xs text-muted-foreground">
                                {description.length}/2000 caracteres
                            </p>
                        </div>

                        {/* Contexto */}
                        <div className="space-y-2">
                            <Label htmlFor="context">Contexto do Projeto</Label>
                            <Textarea
                                id="context"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="Conte um pouco sobre o contexto: para qual canal/plataforma, público-alvo, tom desejado..."
                                rows={4}
                                maxLength={1000}
                            />
                            <p className="text-xs text-muted-foreground">
                                {context.length}/1000 caracteres
                            </p>
                        </div>

                        {/* Arquivos de Referência */}
                        <div className="space-y-2">
                            <Label htmlFor="referenceFiles" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                Link para Arquivos de Referência
                            </Label>
                            <Input
                                id="referenceFiles"
                                value={referenceFilesUrl}
                                onChange={(e) => setReferenceFilesUrl(e.target.value)}
                                placeholder="https://drive.google.com/... ou https://dropbox.com/..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Cole o link do Google Drive, Dropbox ou outro serviço de armazenamento com os arquivos brutos.
                            </p>
                        </div>

                        {/* Links de Referência */}
                        <div className="space-y-2">
                            <Label htmlFor="referenceLinks" className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4" />
                                Links de Referência
                            </Label>
                            <Textarea
                                id="referenceLinks"
                                value={referenceLinks}
                                onChange={(e) => setReferenceLinks(e.target.value)}
                                placeholder="Cole links de vídeos de referência (YouTube, Instagram, TikTok)... Um por linha."
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                                Adicione links de vídeos que mostrem o estilo desejado.
                            </p>
                        </div>
                    </div>

                    {/* Alerta informativo */}
                    <Alert className="mt-6">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Se precisar alterar o tipo de vídeo, estilo ou duração, será necessário criar um novo projeto.
                        </AlertDescription>
                    </Alert>

                    {/* Botões de ação */}
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/creator/project/${id}`)}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
