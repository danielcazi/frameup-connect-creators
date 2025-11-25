import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'small' | 'medium' | 'large';
    showValue?: boolean;
    label?: string;
    className?: string;
}

function RatingStars({
    value,
    onChange,
    readonly = false,
    size = 'medium',
    showValue = false,
    label,
    className,
}: RatingStarsProps) {
    const [hoverValue, setHoverValue] = useState(0);

    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-6 h-6',
        large: 'w-8 h-8',
    };

    const starSize = sizeClasses[size];

    function handleClick(rating: number) {
        if (!readonly && onChange) {
            onChange(rating);
        }
    }

    function handleMouseEnter(rating: number) {
        if (!readonly) {
            setHoverValue(rating);
        }
    }

    function handleMouseLeave() {
        if (!readonly) {
            setHoverValue(0);
        }
    }

    const displayValue = hoverValue || value;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {label && (
                <span className="text-sm font-medium text-foreground">{label}</span>
            )}

            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                        key={rating}
                        type="button"
                        onClick={() => handleClick(rating)}
                        onMouseEnter={() => handleMouseEnter(rating)}
                        onMouseLeave={handleMouseLeave}
                        disabled={readonly}
                        className={`transition-all ${readonly
                                ? 'cursor-default'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            }`}
                        aria-label={`${rating} estrela${rating !== 1 ? 's' : ''}`}
                    >
                        <Star
                            className={`${starSize} transition-colors ${rating <= displayValue
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-muted text-muted-foreground/30'
                                }`}
                        />
                    </button>
                ))}
            </div>

            {showValue && (
                <span className="text-sm font-semibold text-foreground min-w-[2rem]">
                    {value > 0 ? value.toFixed(1) : '—'}
                </span>
            )}
        </div>
    );
}

export default RatingStars;

interface RatingDisplayProps {
    rating: number;
    totalReviews?: number;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
    className?: string;
}

export function RatingDisplay({
    rating,
    totalReviews,
    size = 'medium',
    showLabel = true,
    className,
}: RatingDisplayProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <RatingStars value={rating} readonly size={size} />

            {showLabel && (
                <div className="flex items-center gap-1 text-sm">
                    <span className="font-semibold text-foreground">
                        {rating > 0 ? rating.toFixed(1) : '—'}
                    </span>

                    {totalReviews !== undefined && totalReviews > 0 && (
                        <span className="text-muted-foreground">
                            ({totalReviews} avaliação{totalReviews !== 1 ? 'ões' : ''})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
