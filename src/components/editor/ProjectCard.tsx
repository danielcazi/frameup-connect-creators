import React from 'react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import {
  Calendar,
  DollarSign,
  Clock,
  Film,
  Sparkles,
  Users,
  CheckCircle,
  Lock,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  video_type: string;
  editing_style: string;
  duration: string;
  base_price: number;
  deadline_days: number;
  created_at: string;
  users: {
    full_name: string;
    username: string;
    profile_photo_url?: string;
  };
  _count?: {
    applications: number;
  };
}

interface ProjectCardProps {
  project: Project;
  hasApplied: boolean;
  canApply: boolean;
  onApply: () => void;
}

const videoTypeLabels: Record<string, string> = {
  reels: 'Reels/Shorts',
  youtube: 'YouTube',
  motion: 'Motion Design',
};

const editingStyleLabels: Record<string, string> = {
  lofi: 'Lofi',
  dynamic: 'Dinâmica',
  pro: 'Profissional',
  motion: 'Motion Graphics',
};

const durationLabels: Record<string, string> = {
  '30s': '30 segundos',
  '1m': '1 minuto',
  '2m': '2 minutos',
  '5m': '5+ minutos',
};

function getTimeAgo(date: string) {
  const now = new Date();
  const created = new Date(date);
  const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Agora há pouco';
  if (diffInHours < 24) return `${diffInHours}h atrás`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `${diffInDays} dias atrás`;
  
  return created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, hasApplied, canApply, onApply }) => {
  const applicationCount = project._count?.applications || 0;
  const isFull = applicationCount >= 5;

  return (
    <div className="bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3
            className="font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
            onClick={onApply}
          >
            {project.title}
          </h3>
          
          {hasApplied && (
            <Badge variant="success" size="small">
              <CheckCircle className="w-3 h-3 mr-1" />
              Candidatado
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>

        {/* Creator */}
        <div className="flex items-center gap-2">
          <Avatar
            src={project.users.profile_photo_url}
            alt={project.users.full_name}
            size="small"
            fallback={getInitials(project.users.full_name)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {project.users.full_name}
            </p>
            <p className="text-xs text-muted-foreground">@{project.users.username}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {/* Video Type & Style */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" size="small">
            <Film className="w-3 h-3 mr-1" />
            {videoTypeLabels[project.video_type] || project.video_type}
          </Badge>
          <Badge variant="info" size="small">
            <Sparkles className="w-3 h-3 mr-1" />
            {editingStyleLabels[project.editing_style] || project.editing_style}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Duration */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{durationLabels[project.duration] || project.duration}</span>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{project.deadline_days} dias</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold col-span-2">
            <DollarSign className="w-4 h-4 flex-shrink-0" />
            <span>R$ {project.base_price.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        {/* Applications Count */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {applicationCount} candidatura{applicationCount !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{getTimeAgo(project.created_at)}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 pt-0">
        {hasApplied ? (
          <Button
            variant="secondary"
            size="medium"
            fullWidth
            onClick={onApply}
          >
            Ver Detalhes
          </Button>
        ) : isFull ? (
          <Button
            variant="ghost"
            size="medium"
            fullWidth
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Vagas Preenchidas
          </Button>
        ) : !canApply ? (
          <Button
            variant="ghost"
            size="medium"
            fullWidth
            disabled
          >
            <Lock className="w-4 h-4 mr-2" />
            Limite Atingido
          </Button>
        ) : (
          <Button
            variant="primary"
            size="medium"
            fullWidth
            onClick={onApply}
          >
            Ver Detalhes e Candidatar-se
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
