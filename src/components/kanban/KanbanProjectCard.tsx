// src/components/kanban/KanbanProjectCard.tsx
import {
    Clock,
    DollarSign,
    MessageSquare,
    Package,
    Calendar,
    User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
    id: string;
    title: string;
    status: string;
    is_batch: boolean;
    batch_quantity?: number;
    videos_approved?: number;
    base_price: number;
    editor_name?: string;
    editor_avatar?: string;
    video_type?: string;
    editing_style?: string;
    deadline_at?: string;
    created_at: string;
    unread_messages?: number;
}

interface KanbanProjectCardProps {
    project: Project;
    onClick: () => void;
    onChatClick?: () => void;
}

export function KanbanProjectCard({
    project,
    onClick,
    onChatClick
}: KanbanProjectCardProps) {

    // Calcular dias restantes para prazo
    const daysRemaining = project.deadline_at
        ? Math.ceil((new Date(project.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const isUrgent = daysRemaining !== null && daysRemaining <= 2;
    const isNearDeadline = daysRemaining !== null && daysRemaining <= 5;

    // Calcular progresso do lote
    const batchProgress = project.is_batch && project.batch_quantity
        ? Math.round(((project.videos_approved || 0) / project.batch_quantity) * 100)
        : 0;

    // Formatar valor
    const formattedPrice = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(project.base_price || 0);

    return (
        <div
            className={cn(
                "relative bg-card rounded-xl border-2 transition-all duration-200 cursor-pointer group",
                "hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/50",
                // Destaque especial para LOTES
                project.is_batch
                    ? "border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/20"
                    : "border-border"
            )}
            onClick={onClick}
        >
            {/* Badge de LOTE (topo do card) */}
            {project.is_batch && (
                <div className="absolute -top-2.5 left-3 z-10">
                    <Badge className="bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5 shadow-md">
                        <Package className="w-3 h-3 mr-1" />
                        LOTE ({project.batch_quantity} vídeos)
                    </Badge>
                </div>
            )}

            {/* Conteúdo do Card */}
            <div className={cn("p-3.5", project.is_batch && "pt-5")}>

                {/* Título */}
                <h4 className="font-bold text-sm text-foreground line-clamp-2 mb-2 leading-tight pr-2">
                    {project.title}
                </h4>

                {/* Editor (se atribuído) */}
                {project.editor_name && (
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                            {project.editor_name}
                        </span>
                    </div>
                )}

                {/* Badges: Tipo + Estilo */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.video_type && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {getVideoTypeEmoji(project.video_type)} {formatVideoType(project.video_type)}
                        </Badge>
                    )}
                    {project.editing_style && (
                        <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1.5 py-0", getStyleColor(project.editing_style))}
                        >
                            {project.editing_style}
                        </Badge>
                    )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {/* Valor */}
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-semibold text-foreground">{formattedPrice}</span>
                    </div>

                    {/* Prazo */}
                    {daysRemaining !== null && (
                        <div className={cn(
                            "flex items-center gap-1 font-medium",
                            isUrgent ? "text-red-600 dark:text-red-400" :
                                isNearDeadline ? "text-orange-600 dark:text-orange-400" :
                                    "text-muted-foreground"
                        )}>
                            <Calendar className="w-3 h-3" />
                            <span>{daysRemaining > 0 ? `${daysRemaining}d` : 'Hoje!'}</span>
                        </div>
                    )}
                </div>

                {/* Barra de Progresso (apenas lotes) */}
                {project.is_batch && project.batch_quantity && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400">
                                {project.videos_approved || 0}/{project.batch_quantity}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
                                style={{ width: `${batchProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Footer: Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    {/* Botão Ver Detalhes */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-primary hover:text-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick();
                        }}
                    >
                        Ver Detalhes
                    </Button>

                    {/* Botão Chat (se tiver mensagens não lidas) */}
                    {onChatClick && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-7 w-7 p-0 relative",
                                project.unread_messages && project.unread_messages > 0
                                    ? "text-blue-600 hover:text-blue-700"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChatClick();
                            }}
                        >
                            <MessageSquare className="w-4 h-4" />
                            {/* Badge de mensagens não lidas */}
                            {project.unread_messages && project.unread_messages > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {project.unread_messages > 9 ? '9+' : project.unread_messages}
                                </span>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helpers
function getVideoTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
        'reels': '📱',
        'shorts': '📱',
        'youtube': '📹',
        'motion': '🎨',
        'podcast': '🎙️',
        'vlog': '🎥'
    };
    return emojis[type.toLowerCase()] || '🎬';
}

function formatVideoType(type: string): string {
    const labels: Record<string, string> = {
        'reels': 'Reels',
        'shorts': 'Shorts',
        'youtube': 'YouTube',
        'motion': 'Motion',
        'podcast': 'Podcast',
        'vlog': 'Vlog'
    };
    return labels[type.toLowerCase()] || type;
}

function getStyleColor(style: string): string {
    const colors: Record<string, string> = {
        'lofi': 'border-purple-400 text-purple-600 dark:text-purple-400',
        'dinamic': 'border-blue-400 text-blue-600 dark:text-blue-400',
        'dynamic': 'border-blue-400 text-blue-600 dark:text-blue-400',
        'corporate': 'border-slate-400 text-slate-600 dark:text-slate-400',
        'cinematic': 'border-amber-400 text-amber-600 dark:text-amber-400'
    };
    return colors[style.toLowerCase()] || 'border-gray-400 text-gray-600';
}

export default KanbanProjectCard;
