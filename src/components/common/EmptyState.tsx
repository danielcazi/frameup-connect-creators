import React from 'react';
import { FolderOpen, MessageSquare, Search, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'secondary' | 'outline';
  };
  illustration?: 'projects' | 'messages' | 'search' | 'generic' | 'users';
  className?: string;
}

const illustrations = {
  projects: <FolderOpen className="w-full h-full text-muted-foreground/30" />,
  messages: <MessageSquare className="w-full h-full text-muted-foreground/30" />,
  search: <Search className="w-full h-full text-muted-foreground/30" />,
  generic: <FileText className="w-full h-full text-muted-foreground/30" />,
  users: <Users className="w-full h-full text-muted-foreground/30" />,
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  illustration,
  className,
}) => {
  const displayIcon = illustration ? illustrations[illustration] : icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'max-w-md mx-auto px-6 py-12',
        'animate-fade-in',
        className
      )}
    >
      {/* Icon/Illustration */}
      {displayIcon && (
        <div className="w-32 h-32 mb-6 animate-pulse">
          {displayIcon}
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed max-w-sm">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <Button
          variant={action.variant || 'default'}
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
