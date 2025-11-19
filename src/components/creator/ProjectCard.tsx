import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    status: string;
    updated_at: string;
    current_applications?: number;
    assigned_editor?: {
      full_name: string;
      username: string;
      profile_photo_url?: string;
    };
  };
}

const statusLabels: Record<string, string> = {
  open: 'Aguardando Editor',
  in_progress: 'Em Andamento',
  in_review: 'Em Revisão',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/creator/project/${project.id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className="p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
            {project.title}
          </h3>
          
          {/* Editor Info or Status */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {project.assigned_editor ? (
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={project.assigned_editor.profile_photo_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(project.assigned_editor.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span>Editor: {project.assigned_editor.full_name}</span>
              </div>
            ) : (
              <span>Sem editor atribuído</span>
            )}
            
            <span>•</span>
            <span>
              {formatDistanceToNow(new Date(project.updated_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
          
          {/* Status Badge and Applications */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">
              {statusLabels[project.status] || project.status}
            </Badge>
            
            {project.status === 'open' && project.current_applications !== undefined && (
              <span className="text-sm text-muted-foreground">
                {project.current_applications}/5 candidaturas
              </span>
            )}
          </div>
        </div>
        
        {/* Action Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          Ver Detalhes
        </Button>
      </div>
    </Card>
  );
};

export default ProjectCard;
