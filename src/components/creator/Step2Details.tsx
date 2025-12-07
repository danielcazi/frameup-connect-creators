import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link as LinkIcon } from 'lucide-react';

interface ProjectData {
    video_type: string | null;
    editing_style: string | null;
    duration_category: string | null;
    title: string;
    description: string;
    reference_files_url: string;
    context_description: string;
    reference_links: string;
    total_paid_by_creator: number;
    estimated_delivery_days: number;
}

interface Step2DetailsProps {
    data: ProjectData;
    onChange: (updates: Partial<ProjectData>) => void;
    onBack: () => void;
    onSubmit: () => void;
    submitLabel?: string;
}

export function Step2Details({ data, onChange, onBack, onSubmit, submitLabel = 'Ir para Pagamento →' }: Step2DetailsProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!data.title || data.title.length < 5) {
            newErrors.title = 'Título deve ter no mínimo 5 caracteres';
        }

        if (!data.description || data.description.length < 50) {
            newErrors.description = 'Descrição deve ter no mínimo 50 caracteres';
        }

        if (!data.reference_files_url) {
            newErrors.reference_files_url = 'Link para materiais é obrigatório';
        } else if (!isValidUrl(data.reference_files_url)) {
            newErrors.reference_files_url = 'URL inválida (inclua https://)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSubmit();
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Principal - Formulário */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Título do Projeto */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-base font-semibold">
                            Título do Projeto <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="title"
                            placeholder="Ex: Edição de Vlog Semanal para YouTube"
                            value={data.title}
                            onChange={(e) => onChange({ title: e.target.value })}
                            className={errors.title ? 'border-destructive' : ''}
                            maxLength={100}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{errors.title ? <span className="text-destructive">{errors.title}</span> : 'Seja claro e descritivo sobre o que você precisa'}</span>
                            <span>{data.title.length}/100</span>
                        </div>
                    </div>

                    {/* Descrição Detalhada */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-base font-semibold">
                            Descrição Detalhada <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="description"
                            className={`min-h-[150px] resize-none ${errors.description ? 'border-destructive' : ''}`}
                            placeholder="Detalhe o máximo possível sobre o que você espera do editor. Inclua informações sobre o conteúdo, estilo desejado, público-alvo, etc."
                            value={data.description}
                            onChange={(e) => onChange({ description: e.target.value })}
                            maxLength={2000}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{errors.description ? <span className="text-destructive">{errors.description}</span> : 'Mínimo de 50 caracteres'}</span>
                            <span>{data.description.length}/2000</span>
                        </div>
                    </div>

                    {/* Link para Materiais */}
                    <div className="space-y-2">
                        <Label htmlFor="reference_files_url" className="text-base font-semibold">
                            Link para os Materiais <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="reference_files_url"
                                type="url"
                                placeholder="https://drive.google.com/..."
                                value={data.reference_files_url}
                                onChange={(e) => onChange({ reference_files_url: e.target.value })}
                                className={`pl-9 ${errors.reference_files_url ? 'border-destructive' : ''}`}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{errors.reference_files_url ? <span className="text-destructive">{errors.reference_files_url}</span> : 'Compartilhe um link do Google Drive, Dropbox ou WeTransfer'}</span>
                        </div>
                    </div>

                    {/* Contexto Geral (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="context_description" className="text-base font-semibold">
                            Contexto Geral do Projeto
                        </Label>
                        <Textarea
                            id="context_description"
                            className="min-h-[100px] resize-none"
                            placeholder="Ex: Este é um canal de culinária focado em receitas rápidas. O público é jovem e engajado nas redes sociais."
                            value={data.context_description}
                            onChange={(e) => onChange({ context_description: e.target.value })}
                            maxLength={1000}
                        />
                        <div className="flex justify-end text-xs text-muted-foreground">
                            <span>{data.context_description.length}/1000</span>
                        </div>
                    </div>

                    {/* Links de Referência (Opcional) */}
                    <div className="space-y-2">
                        <Label htmlFor="reference_links" className="text-base font-semibold">
                            Links de Referência do Resultado Esperado
                        </Label>
                        <Textarea
                            id="reference_links"
                            className="min-h-[80px] resize-none"
                            placeholder="Cole links de vídeos que você gosta do estilo de edição. Ex: https://youtube.com/watch?v=..."
                            value={data.reference_links}
                            onChange={(e) => onChange({ reference_links: e.target.value })}
                            maxLength={500}
                        />
                        <div className="flex justify-end text-xs text-muted-foreground">
                            <span>{data.reference_links.length}/500</span>
                        </div>
                    </div>
                </div>

                {/* Coluna Lateral - Resumo */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        <Card className="bg-muted/30">
                            <CardHeader>
                                <CardTitle className="text-lg">Resumo do Projeto</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="font-medium capitalize">{data.video_type}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Estilo:</span>
                                    <span className="font-medium capitalize">{data.editing_style}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Duração:</span>
                                    <span className="font-medium">{data.duration_category}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Prazo estimado:</span>
                                    <span className="font-medium">{data.estimated_delivery_days} dias úteis</span>
                                </div>

                                <div className="border-t pt-4 flex justify-between items-center">
                                    <span className="font-semibold">Valor Total:</span>
                                    <span className="font-bold text-xl text-primary">
                                        R$ {data.total_paid_by_creator.toFixed(2)}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Botões de Navegação */}
            <div className="flex justify-between pt-6 border-t border-border">
                <Button
                    variant="outline"
                    onClick={onBack}
                >
                    ← Voltar
                </Button>

                <Button
                    variant="default"
                    onClick={handleSubmit}
                    size="lg"
                >
                    {submitLabel}
                </Button>
            </div>
        </div>
    );
}
