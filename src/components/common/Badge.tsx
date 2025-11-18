import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'status';
  status?: 'open' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
  size?: 'small' | 'medium' | 'large';
  rounded?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const statusConfig = {
  open: { label: 'Aberto', color: 'gray' },
  in_progress: { label: 'Em Andamento', color: 'yellow' },
  in_review: { label: 'Em Revisão', color: 'blue' },
  completed: { label: 'Concluído', color: 'green' },
  cancelled: { label: 'Cancelado', color: 'red' }
} as const;

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      variant = 'default',
      status,
      size = 'medium',
      rounded = false,
      children,
      icon,
      className,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variantStyles = {
      default: 'bg-muted text-muted-foreground',
      success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      status: '', // Will be overridden by status-specific styles
    };

    // Status-specific styles
    const statusStyles = status ? {
      open: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
      in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 animate-pulse',
      in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    }[status] : '';

    // Size styles
    const sizeStyles = {
      small: 'text-xs px-1.5 py-0.5',
      medium: 'text-sm px-2 py-1',
      large: 'text-base px-3 py-1.5',
    };

    // Icon size based on badge size
    const iconSizeStyles = {
      small: '[&_svg]:w-3 [&_svg]:h-3',
      medium: '[&_svg]:w-3.5 [&_svg]:h-3.5',
      large: '[&_svg]:w-4 [&_svg]:h-4',
    };

    // Border radius
    const roundedStyles = rounded ? 'rounded-full' : 'rounded';

    // Content to display
    const content = status ? statusConfig[status].label : children;

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-semibold transition-all duration-200 animate-fade-in',
          status ? statusStyles : variantStyles[variant],
          sizeStyles[size],
          iconSizeStyles[size],
          roundedStyles,
          className
        )}
        {...props}
      >
        {icon && <span className="inline-flex items-center">{icon}</span>}
        {content}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
