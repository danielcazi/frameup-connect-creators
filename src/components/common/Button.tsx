import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      disabled = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      children,
      className,
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Variant styles
    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
      secondary: 'bg-background text-primary border-2 border-primary hover:bg-accent',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      ghost: 'bg-transparent text-primary hover:bg-accent',
    };

    // Size styles
    const sizeStyles = {
      small: 'h-8 px-3 text-sm',
      medium: 'h-10 px-4 text-base',
      large: 'h-12 px-6 text-lg',
    };

    // Icon size
    const iconSizeStyles = {
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-6 h-6',
    };

    // Spinner size
    const spinnerSizeStyles = {
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-6 h-6',
    };

    const baseStyles = cn(
      'inline-flex items-center justify-center gap-2',
      'rounded-lg font-medium',
      'transition-all duration-200 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      'active:scale-98',
      !isDisabled && 'hover:scale-102 hover:shadow-md',
      isDisabled && 'opacity-50 cursor-not-allowed',
      fullWidth && 'w-full',
      variantStyles[variant],
      sizeStyles[size],
      className
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const iconElement = icon && !loading && (
      <span className={cn('shrink-0', iconSizeStyles[size])}>{icon}</span>
    );

    const spinnerElement = loading && (
      <Loader2
        className={cn('animate-spin shrink-0', spinnerSizeStyles[size])}
        aria-hidden="true"
      />
    );

    return (
      <button
        ref={ref}
        type={type}
        onClick={handleClick}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        className={baseStyles}
        {...props}
      >
        {loading && spinnerElement}
        {!loading && iconPosition === 'left' && iconElement}
        <span className="whitespace-nowrap">{children}</span>
        {!loading && iconPosition === 'right' && iconElement}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
