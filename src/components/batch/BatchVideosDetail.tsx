import { useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { BatchVideoCreate, RawFootageDuration } from '@/types';

interface BatchVideosDetailProps {
    quantity: number;
    videos: BatchVideoCreate[];
    onUpdate: (videos: BatchVideoCreate[]) => void;
    rawFootageDuration: RawFootageDuration | string;
}

export function BatchVideosDetail({
    quantity,
    videos,
    onUpdate,
    rawFootageDuration
}: BatchVideosDetailProps) {
    const [globalEditorChoice, setGlobalEditorChoice] = useState(false);

    // Inicializar vídeos se necessário
    const ensureVideos = (): BatchVideoCreate[] => {
        const currentVideos = [...videos];

        // Adicionar vídeos faltantes
        while (currentVideos.length < quantity) {
            currentVideos.push({
                sequence_order: currentVideos.length + 1,
                title: '',
                specific_instructions: '',
                editor_can_choose_timing: globalEditorChoice,
            });
        }

        // Remover vídeos excedentes
        if (currentVideos.length > quantity) {
            currentVideos.splice(quantity);
        }

        return currentVideos;
    };

    const updateVideo = (index: number, updates: Partial<BatchVideoCreate>) => {
        const newVideos = ensureVideos();
        newVideos[index] = {
            ...newVideos[index],
            ...updates,
            sequence_order: index + 1
        };
        onUpdate(newVideos);
    };

    const toggleGlobalEditorChoice = (value: boolean) => {
        setGlobalEditorChoice(value);
        const newVideos = ensureVideos().map((v, i) => ({
            ...v,
            sequence_order: i + 1,
            editor_can_choose_timing: value,
            selected_timestamp_start: value ? undefined : v.selected_timestamp_start,
            selected_timestamp_end: value ? undefined : v.selected_timestamp_end,
            title: value ? `Vídeo ${i + 1} - Editor escolhe` : v.title,
        }));
        onUpdate(newVideos);
    };

    const currentVideos = ensureVideos();
    const showTimestamps = rawFootageDuration && rawFootageDuration !== '0-30min';

    return (
        <section className="space-y-6 border-t-2 border-border pt-6 mt-6">
            <div>
                <h3 className="text-xl font-bold mb-2 text-foreground flex items-center gap-2">
                    🎬 Detalhamento dos {quantity} Vídeos
                </h3>
                <p className="text-sm text-muted-foreground">
                    Especifique o que você quer em cada vídeo. Se tiver material longo (ex: podcast),
                    indique a minutagem ou deixe o editor escolher as melhores partes.
                </p>
            </div>

            {/* Opção Global - Editor Escolhe */}
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={globalEditorChoice}
                        onChange={(e) => toggleGlobalEditorChoice(e.target.checked)}
                        className="mt-1 accent-primary w-5 h-5"
                    />
                    <div className="flex-1">
                        <div className="font-semibold text-foreground">
                            ✨ Deixar o editor escolher as melhores partes
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                            O editor vai selecionar os {quantity} melhores trechos do seu material bruto.
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1 font-medium">
                            <AlertCircle className="w-3 h-3" />
                            <strong>Importante:</strong> Você não poderá alterar a minutagem escolhida nas revisões.
                        </div>
                    </div>
                </label>
            </div>

            {/* Lista de Vídeos */}
            <div className="space-y-4">
                {Array.from({ length: quantity }).map((_, index) => {
                    const video = currentVideos[index] || {
                        sequence_order: index + 1,
                        title: '',
                        specific_instructions: '',
                        editor_can_choose_timing: globalEditorChoice,
                    };

                    return (
                        <div
                            key={index}
                            className={`border-2 rounded-lg p-5 transition-all ${globalEditorChoice
                                    ? 'border-muted bg-muted/30 opacity-60'
                                    : 'border-border bg-card hover:border-primary/50'
                                }`}
                        >
                            {/* Header do Vídeo */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">Vídeo #{index + 1}</h4>
                                    {video.editor_can_choose_timing && (
                                        <span className="text-xs text-primary">Editor escolherá o trecho</span>
                                    )}
                                </div>
                            </div>

                            {/* Título do Vídeo */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Título/Objetivo deste vídeo *
                                </label>
                                <input
                                    type="text"
                                    placeholder={`Ex: Introdução do produto, Tutorial parte ${index + 1}, Highlights...`}
                                    value={video.title}
                                    onChange={(e) => updateVideo(index, { title: e.target.value })}
                                    disabled={globalEditorChoice}
                                    required={!globalEditorChoice}
                                    className="w-full px-4 py-2 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background disabled:bg-muted disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Instruções Específicas */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-foreground">
                                    Instruções específicas (opcional)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Detalhes sobre o que deve aparecer neste vídeo, estilo, elementos obrigatórios..."
                                    value={video.specific_instructions || ''}
                                    onChange={(e) => updateVideo(index, { specific_instructions: e.target.value })}
                                    disabled={globalEditorChoice}
                                    className="w-full px-4 py-2 border-2 border-input rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background text-sm resize-none disabled:bg-muted disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Minutagem (apenas se material longo e não for editor choice) */}
                            {showTimestamps && !globalEditorChoice && (
                                <div className="bg-muted/50 border border-border rounded-lg p-4">
                                    <label className="flex items-center gap-2 text-sm font-medium mb-3 text-foreground">
                                        <Clock className="w-4 h-4 text-primary" />
                                        Minutagem do material bruto (opcional)
                                    </label>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">De:</span>
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                min={0}
                                                value={video.selected_timestamp_start ? Math.floor(video.selected_timestamp_start / 60) : ''}
                                                onChange={(e) => {
                                                    const mins = parseInt(e.target.value) || 0;
                                                    updateVideo(index, { selected_timestamp_start: mins * 60 });
                                                }}
                                                className="w-20 px-3 py-1.5 border-2 border-input rounded-lg text-sm text-center bg-background"
                                            />
                                            <span className="text-xs text-muted-foreground">min</span>
                                        </div>

                                        <span className="text-muted-foreground">→</span>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground">Até:</span>
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                min={0}
                                                value={video.selected_timestamp_end ? Math.floor(video.selected_timestamp_end / 60) : ''}
                                                onChange={(e) => {
                                                    const mins = parseInt(e.target.value) || 0;
                                                    updateVideo(index, { selected_timestamp_end: mins * 60 });
                                                }}
                                                className="w-20 px-3 py-1.5 border-2 border-input rounded-lg text-sm text-center bg-background"
                                            />
                                            <span className="text-xs text-muted-foreground">min</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        💡 Ex: Use os minutos 15 até 18 do podcast para este corte
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Resumo */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de vídeos configurados:</span>
                    <span className="font-bold text-foreground">
                        {currentVideos.filter(v => v.title || globalEditorChoice).length} / {quantity}
                    </span>
                </div>
                {!globalEditorChoice && currentVideos.some(v => !v.title) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ Preencha o título de todos os vídeos para continuar
                    </p>
                )}
            </div>
        </section>
    );
}
