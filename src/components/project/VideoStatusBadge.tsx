// src/components/project/VideoStatusBadge.tsx
import { BatchVideoStatus, getVideoStatusConfig } from '@/utils/batchHelpers';
import { cn } from '@/lib/utils';

interface VideoStatusBadgeProps {
    status: BatchVideoStatus;
    className?: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function VideoStatusBadge({
    status,
    className = '',
    showIcon = true,
    size = 'md'
}: VideoStatusBadgeProps) {
    const config = getVideoStatusConfig(status);

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm'
    };

    return (
        <span
            className={cn(
                'rounded-full font-semibold inline-flex items-center gap-1.5 transition-all duration-300',
                config.badgeClass,
                sizeClasses[size],
                className
            )}
        >
            {showIcon && <span>{config.icon}</span>}
            {config.label}
        </span>
    );
}

export default VideoStatusBadge;
