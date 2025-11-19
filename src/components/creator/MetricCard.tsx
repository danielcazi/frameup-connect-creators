import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactElement<LucideIcon>;
  color: 'blue' | 'green' | 'yellow' | 'red';
  subtitle?: string;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  red: 'bg-red-100 text-red-600',
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  subtitle,
}) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full',
          colorClasses[color]
        )}>
          {React.cloneElement(icon, { size: 24 } as any)}
        </div>
        
        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
