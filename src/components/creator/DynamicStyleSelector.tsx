// src/components/creator/DynamicStyleSelector.tsx
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { useAvailableStyles, type StyleOption } from '@/hooks/useAvailableStyles';

interface DynamicStyleSelectorProps {
    videoType: string | null;
    selectedStyle: string | null;
    onSelect: (style: string) => void;
}

// Ícones para cada estilo
const STYLE_ICONS: Record<string, React.ReactNode> = {
    lofi: '🎵',
    dynamic: '⚡',
    pro: '🎬',
    motion: '✨'
};

export function DynamicStyleSelector({
    videoType,
    selectedStyle,
    onSelect
}: DynamicStyleSelectorProps) {
    const { styles, loading, error } = useAvailableStyles(videoType);

    // Não renderizar se tipo não selecionado
    if (!videoType) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Selecione o tipo de vídeo primeiro</p>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-muted-foreground">Carregando estilos...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-8 text-destructive">
                <Sparkles className="w-8 h-8 mx-auto mb-2" />
                <p>{error}</p>
            </div>
        );
    }

    // No styles available
    if (styles.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum estilo disponível para este tipo de vídeo</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {styles.map((style) => (
                <StyleCard
                    key={style.value}
                    style={style}
                    icon={STYLE_ICONS[style.value] || '🎨'}
                    selected={selectedStyle === style.value}
                    onClick={() => onSelect(style.value)}
                />
            ))}
        </div>
    );
}

// Subcomponente StyleCard
interface StyleCardProps {
    style: StyleOption;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
}

function StyleCard({ style, icon, selected, onClick }: StyleCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
        relative p-5 rounded-xl border-2 transition-all duration-200 text-left
        hover:border-primary/50 hover:bg-primary/5 hover:shadow-md
        ${selected
                    ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/20'
                    : 'border-border bg-card'
                }
      `}
        >
            <div className="flex items-start gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                    <h4 className={`font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>
                        {style.label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {style.description}
                    </p>
                </div>
            </div>

            {selected && (
                <div className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                </div>
            )}
        </button>
    );
}
