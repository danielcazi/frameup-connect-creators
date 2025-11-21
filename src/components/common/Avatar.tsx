import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = 'Avatar',
      size = 'medium',
      className,
      fallback,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    // Size styles
    const sizeStyles = {
      small: 'w-8 h-8 text-xs',
      medium: 'w-10 h-10 text-sm',
      large: 'w-12 h-12 text-base',
    };

    // Icon size
    const iconSizeStyles = {
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-6 h-6',
    };

    const baseStyles = cn(
      'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-muted',
      sizeStyles[size],
      className
    );

    const showFallback = !src || imageError;

    return (
      <div ref={ref} className={baseStyles} {...props}>
        {!showFallback && src ? (
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : fallback ? (
          <span className="font-semibold text-muted-foreground">
            {fallback}
          </span>
        ) : (
          <User className={cn('text-muted-foreground', iconSizeStyles[size])} />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
