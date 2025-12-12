// src/components/creator/DynamicDurationSelector.tsx
import { Clock, Loader2 } from 'lucide-react';
import { useDynamicDurations, type DurationOption } from '@/hooks/useDynamicDurations';

interface DynamicDurationSelectorProps {
    videoType: string | null;
    editingStyle: string | null;
    selectedDuration: string | null;
    onSelect: (duration: string) => void;
}

export function DynamicDurationSelector({
    videoType,
    editingStyle,
    selectedDuration,
    onSelect
}: DynamicDurationSelectorProps) {
    const { durations, loading, error } = useDynamicDurations(videoType, editingStyle);

    // Não renderizar se tipo ou estilo não selecionados
    if (!videoType || !editingStyle) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Selecione o tipo de vídeo e estilo de edição primeiro</p>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando durações...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-8 text-destructive">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
            </div>
        );
    }

    // No durations available
    if (durations.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma duração disponível para esta combinação</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {durations.map((duration) => (
                <DurationCard
                    key={duration.value}
                    duration={duration.value}
                    label={duration.label}
                    selected={selectedDuration === duration.value}
                    onClick={() => onSelect(duration.value)}
                />
            ))}
        </div>
    );
}

// Subcomponente DurationCard
interface DurationCardProps {
    duration: string;
    label: string;
    selected: boolean;
    onClick: () => void;
}

function DurationCard({ duration, label, selected, onClick }: DurationCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
        relative p-4 rounded-xl border-2 transition-all duration-200
        flex flex-col items-center justify-center gap-2
        hover:border-primary/50 hover:bg-primary/5
        ${selected
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-border bg-card'
                }
      `}
        >
            <Clock className={`w-6 h-6 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`font-bold text-lg ${selected ? 'text-primary' : 'text-foreground'}`}>
                {duration}
            </span>
            <span className="text-xs text-muted-foreground">
                {label}
            </span>

            {selected && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full" />
            )}
        </button>
    );
}
