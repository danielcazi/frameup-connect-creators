import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
    duration_category: string;
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

function ProjectCard({ project, hasApplied, canApply, onApply }: ProjectCardProps) {
    const navigate = useNavigate();

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

    const applicationCount = project._count?.applications || 0;
    const isFull = applicationCount >= 5;

    return (
        <div className="bg-card rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <h3
                        className="font-semibold text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                        onClick={onApply}
                    >
                        {project.title}
                    </h3>

                    {hasApplied && (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white shrink-0">
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
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={project.users.profile_photo_url} alt={project.users.full_name} />
                        <AvatarFallback>{project.users.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
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
                    <Badge variant="secondary" className="font-normal">
                        <Film className="w-3 h-3 mr-1" />
                        {videoTypeLabels[project.video_type] || project.video_type}
                    </Badge>
                    <Badge variant="default" className="font-normal">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {editingStyleLabels[project.editing_style] || project.editing_style}
                    </Badge>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* Duration */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{durationLabels[project.duration_category] || project.duration_category}</span>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{project.deadline_days} dias</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 text-green-600 font-semibold col-span-2">
                        <DollarSign className="w-4 h-4 flex-shrink-0" />
                        <span>R$ {Number(project.base_price).toFixed(2).replace('.', ',')}</span>
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
            <div className="p-4 pt-0 mt-auto">
                {hasApplied ? (
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={onApply}
                    >
                        Ver Detalhes
                    </Button>
                ) : isFull ? (
                    <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Vagas Preenchidas
                    </Button>
                ) : !canApply ? (
                    <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                    >
                        <Lock className="w-4 h-4 mr-2" />
                        Limite Atingido
                    </Button>
                ) : (
                    <Button
                        className="w-full"
                        onClick={onApply}
                    >
                        Ver Detalhes e Candidatar-se
                    </Button>
                )}
            </div>
        </div>
    );
}

export default ProjectCard;
