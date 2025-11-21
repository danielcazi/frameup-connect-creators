import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, DollarSign, Users, Calendar, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectCardProps {
  project: {
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
  };
  hasApplied: boolean;
  canApply: boolean;
  onApply: () => void;
}

const videoTypeLabels: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  podcast: 'Podcast',
  corporate: 'Corporativo',
  advertisement: 'Publicitário',
  other: 'Outro',
};

const editingStyleLabels: Record<string, string> = {
  dynamic: 'Dinâmico',
  minimalist: 'Minimalista',
  cinematic: 'Cinemático',
  commercial: 'Comercial',
  documentary: 'Documentário',
  creative: 'Criativo',
};

const durationLabels: Record<string, string> = {
  'short': '< 1 min',
  'medium': '1-5 min',
  'long': '5-15 min',
  'very_long': '> 15 min',
};

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  hasApplied,
  canApply,
  onApply,
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const applicationCount = project._count?.applications || 0;
  const isFull = applicationCount >= 5;

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header - Creator Info */}
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={project.users.profile_photo_url} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(project.users.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {project.users.full_name}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              @{project.users.username}
            </p>
          </div>

          {hasApplied && (
            <Badge variant="secondary" className="shrink-0">
              <CheckCircle className="w-3 h-3 mr-1" />
              Candidatou
            </Badge>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
            {project.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {project.description}
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {videoTypeLabels[project.video_type] || project.video_type}
          </Badge>
          <Badge variant="outline">
            {editingStyleLabels[project.editing_style] || project.editing_style}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-foreground font-medium">
              R$ {project.base_price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {project.deadline_days} dias
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {durationLabels[project.duration] || project.duration}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {applicationCount}/5 candidatos
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(project.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>

          <Button
            size="sm"
            onClick={onApply}
            disabled={hasApplied || isFull || !canApply}
          >
            {hasApplied
              ? 'Candidatura Enviada'
              : isFull
              ? 'Vagas Preenchidas'
              : !canApply
              ? 'Limite Atingido'
              : 'Ver Detalhes'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
