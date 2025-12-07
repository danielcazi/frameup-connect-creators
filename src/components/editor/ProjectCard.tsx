import { useState } from 'react';
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
    Crown,
} from 'lucide-react';
import SubscriptionRequiredModal from '@/components/subscription/SubscriptionRequiredModal';

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
    status?: string;
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
    hasSubscription: boolean; // NOVO: indica se tem assinatura ativa
    onApply: () => void;
    showStatus?: boolean;
}

function ProjectCard({
    project,
    hasApplied,
    canApply,
    hasSubscription,
    onApply,
    showStatus
}: ProjectCardProps) {
    const navigate = useNavigate();
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    const statusLabels: Record<string, string> = {
        open: 'Aberto',
        in_progress: 'Em Andamento',
        in_review: 'Em Revisão',
        completed: 'Concluído',
        cancelled: 'Cancelado',
    };

    const statusColors: Record<string, string> = {
        open: 'bg-blue-500',
        in_progress: 'bg-yellow-500',
        in_review: 'bg-purple-500',
        completed: 'bg-green-500',
        cancelled: 'bg-red-500',
    };

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

    // Determinar qual botão mostrar
    function renderActionButton() {
        // Já se candidatou
        if (hasApplied) {
            return (
                <Button
                    variant="secondary"
                    className="w-full"
                    onClick={onApply}
                >
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Ver Detalhes
                </Button>
            );
        }

        // Vagas preenchidas
        if (isFull) {
            return (
                <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                >
                    <Lock className="w-4 h-4 mr-2" />
                    Vagas Preenchidas
                </Button>
            );
        }

        // Sem assinatura - mostrar botão para assinar
        if (!hasSubscription) {
            return (
                <Button
                    className="w-full"
                    onClick={() => setShowSubscriptionModal(true)}
                >
                    <Crown className="w-4 h-4 mr-2" />
                    Candidatar-se
                </Button>
            );
        }

        // Tem assinatura mas atingiu limite de projetos
        if (!canApply) {
            return (
                <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                >
                    <Lock className="w-4 h-4 mr-2" />
                    Limite de Projetos
                </Button>
            );
        }

        // Pode se candidatar normalmente
        return (
            <Button
                className="w-full"
                onClick={onApply}
            >
                Ver Detalhes e Candidatar-se
            </Button>
        );
    }

    return (
        <>
            <div className="bg-card rounded-lg border border-border hover:border-primary/50 transition-all p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={project.users.profile_photo_url} />
                            <AvatarFallback>
                                {project.users.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-foreground text-sm">
                                {project.users.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                @{project.users.username}
                            </p>
                        </div>
                    </div>

                    {showStatus && project.status && (
                        <Badge className={statusColors[project.status]}>
                            {statusLabels[project.status]}
                        </Badge>
                    )}

                    {hasApplied && !showStatus && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Candidatado
                        </Badge>
                    )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground text-lg mb-2 line-clamp-2">
                    {project.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="text-xs">
                        <Film className="w-3 h-3 mr-1" />
                        {videoTypeLabels[project.video_type] || project.video_type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        {editingStyleLabels[project.editing_style] || project.editing_style}
                    </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {durationLabels[project.duration_category] || project.duration_category}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {project.deadline_days} dias
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary flex items-center gap-1">
                            <DollarSign className="w-5 h-5" />
                            R$ {project.base_price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {applicationCount} candidatura{applicationCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground mb-4">
                    {getTimeAgo(project.created_at)}
                </p>

                {/* Action Button */}
                {renderActionButton()}
            </div>

            {/* Modal de Assinatura */}
            <SubscriptionRequiredModal
                isOpen={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
            />
        </>
    );
}

export default ProjectCard;
