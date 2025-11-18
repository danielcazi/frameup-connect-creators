import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  variant?: 'default' | 'highlighted' | 'pro';
  clickable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
  children: React.ReactNode;
  className?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      clickable = false,
      onClick,
      padding = 'medium',
      shadow = 'small',
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variantStyles = {
      default: 'bg-card border border-border',
      highlighted: 'bg-card border-2 border-primary shadow-[0_0_20px_rgba(37,99,235,0.15)]',
      pro: 'bg-gradient-to-br from-amber-50 to-white border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
    };

    // Padding styles
    const paddingStyles = {
      none: 'p-0',
      small: 'p-3',
      medium: 'p-4 md:p-6',
      large: 'p-6 md:p-8',
    };

    // Shadow styles
    const shadowStyles = {
      none: '',
      small: 'shadow-sm',
      medium: 'shadow-md',
      large: 'shadow-lg',
    };

    // Clickable styles
    const clickableStyles = clickable
      ? 'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] hover:border-primary/60'
      : '';

    return (
      <div
        ref={ref}
        onClick={clickable ? onClick : undefined}
        className={cn(
          'rounded-lg relative transition-all duration-200',
          variantStyles[variant],
          paddingStyles[padding],
          shadowStyles[shadow],
          clickableStyles,
          className
        )}
        {...props}
      >
        {/* PRO Badge */}
        {variant === 'pro' && (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs px-3 py-1 rounded-tl-none rounded-tr-lg rounded-bl-lg rounded-br-none shadow-md">
            PRO
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
