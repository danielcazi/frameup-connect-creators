import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFavoriteCheck } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
    editorId: string;
    editorName?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
    onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({
    editorId,
    editorName = 'este editor',
    size = 'md',
    showLabel = false,
    className,
    onToggle,
}: FavoriteButtonProps) {
    const { toast } = useToast();
    const { isFavorite, toggle, loading: initialLoading, isCreator } = useFavoriteCheck();
    const [toggling, setToggling] = useState(false);

    const isFav = isFavorite(editorId);

    // Não mostrar para não-creators
    if (!isCreator) return null;

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (toggling || initialLoading) return;

        setToggling(true);
        try {
            const newState = await toggle(editorId);

            toast({
                title: newState ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
                description: newState
                    ? `${editorName} foi adicionado aos seus favoritos.`
                    : `${editorName} foi removido dos seus favoritos.`,
            });

            onToggle?.(newState);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Não foi possível atualizar favoritos.',
            });
        } finally {
            setToggling(false);
        }
    };

    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const isLoading = toggling || initialLoading;

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className={cn(
                'group rounded-full transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isFav
                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-yellow-500',
                sizeClasses[size],
                className
            )}
        >
            <div className="flex items-center gap-2">
                {isLoading ? (
                    <Loader2 className={cn('animate-spin', iconSizes[size])} />
                ) : (
                    <Star
                        className={cn(
                            iconSizes[size],
                            'transition-transform duration-200',
                            isFav ? 'fill-current animate-favorite-pop' : 'group-hover:scale-110'
                        )}
                    />
                )}

                {showLabel && (
                    <span className={cn(
                        'text-sm font-medium',
                        size === 'sm' && 'text-xs'
                    )}>
                        {isFav ? 'Favoritado' : 'Favoritar'}
                    </span>
                )}
            </div>
        </button>
    );
}

// Variante inline para usar em listas
export function FavoriteButtonInline({
    editorId,
    editorName,
    onToggle,
}: Omit<FavoriteButtonProps, 'size' | 'showLabel' | 'className'>) {
    const { toast } = useToast();
    const { isFavorite, toggle, loading: initialLoading, isCreator } = useFavoriteCheck();
    const [toggling, setToggling] = useState(false);

    const isFav = isFavorite(editorId);

    if (!isCreator) return null;

    const handleClick = async () => {
        if (toggling || initialLoading) return;

        setToggling(true);
        try {
            const newState = await toggle(editorId);

            toast({
                title: newState ? 'Adicionado aos favoritos' : 'Removido dos favoritos',
            });

            onToggle?.(newState);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message,
            });
        } finally {
            setToggling(false);
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={toggling || initialLoading}
            className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                isFav
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-yellow-600'
            )}
        >
            {toggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Star className={cn('w-4 h-4', isFav && 'fill-current animate-favorite-pop')} />
            )}
            {isFav ? 'Favoritado' : 'Favoritar'}
        </button>
    );
}
