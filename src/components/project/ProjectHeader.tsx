import { ArrowLeft, Calendar, DollarSign, Package, User, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =====================================================
// INTERFACES
// =====================================================
interface ProjectHeaderProps {
    project: {
        id: string;
        title: string;
        status: string;
        is_batch: boolean;
        batch_quantity?: number | null;
        batch_delivery_mode?: 'sequential' | 'simultaneous' | null;
        videos_approved?: number;
        batch_stats_counts?: {
            approved: number;
            delivered: number; // delivered + revision + pending_review
            in_progress: number;
        };
        base_price: number;
        deadline_at: string;
        creator_name: string;
        creator_photo?: string | null;
        editor_name?: string | null;
        editor_photo?: string | null;
    };
    userRole: 'creator' | 'editor';
}

// =====================================================
// CONFIGURAÇÃO DE STATUS
// =====================================================
const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    pending: {
        label: 'Aguardando',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        icon: Clock
    },
    pending_acceptance: {
        label: 'Aguardando Aceitação',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Clock
    },
    in_progress: {
        label: 'Em Andamento',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Clock
    },
    delivered: {
        label: 'Entregue',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        icon: Package
    },
    revision: {
        label: 'Em Revisão',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        icon: Clock
    },
    completed: {
        label: 'Concluído',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: CheckCircle
    },
    cancelled: {
        label: 'Cancelado',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: Clock
    }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export function ProjectHeader({ project, userRole }: ProjectHeaderProps) {
    const navigate = useNavigate();
    const config = statusConfig[project.status] || statusConfig.pending;
    const StatusIcon = config.icon;

    // Determinar o outro usuário (cliente vê editor, editor vê cliente)
    const otherUser = userRole === 'creator'
        ? {
            label: 'Editor',
            name: project.editor_name,
            photo: project.editor_photo
        }
        : {
            label: 'Cliente',
            name: project.creator_name,
            photo: project.creator_photo
        };

    // Calcular prazo
    const deadlineDate = new Date(project.deadline_at);
    const isOverdue = deadlineDate < new Date() && project.status !== 'completed';
    const deadlineText = formatDistanceToNow(deadlineDate, {
        addSuffix: true,
        locale: ptBR
    });

    // Progresso do lote
    const batchProgress = project.is_batch && project.batch_quantity
        ? Math.round(((project.videos_approved || 0) / project.batch_quantity) * 100)
        : 0;

    return (
        <header className="bg-card border-b-2 border-border sticky top-16 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4">

                {/* Botão Voltar */}
                <button
                    onClick={() => navigate(userRole === 'creator' ? '/creator/dashboard' : '/editor/dashboard')}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Voltar ao Dashboard</span>
                </button>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                        {/* Título + Badges */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h1 className="text-2xl font-bold text-foreground truncate">
                                {project.title}
                            </h1>

                            {/* Badge de Lote */}
                            {project.is_batch && project.batch_quantity && (
                                <span className="shrink-0 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    Lote ({project.batch_quantity} vídeos)
                                </span>
                            )}

                            {/* Badge de Modo */}
                            {project.is_batch && project.batch_delivery_mode && (
                                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${project.batch_delivery_mode === 'sequential'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                    }`}>
                                    {project.batch_delivery_mode === 'sequential' ? '📅 Sequencial' : '⚡ Simultâneo'}
                                </span>
                            )}
                        </div>

                        {/* Metadados */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                            {/* Status */}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold ${config.color}`}>
                                <StatusIcon className="w-4 h-4" />
                                {config.label}
                            </span>

                            {/* Progresso do Lote */}
                            {project.is_batch && project.batch_quantity && (
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Progresso:</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex">
                                            {/* Aprovados (Verde) */}
                                            <div
                                                className="h-full bg-green-500"
                                                style={{ width: `${project.batch_stats_counts ? (project.batch_stats_counts.approved / project.batch_quantity) * 100 : batchProgress}%` }}
                                            />

                                            {/* Em Revisão (Laranja) */}
                                            {project.batch_stats_counts && project.batch_stats_counts.delivered > 0 && (
                                                <div
                                                    className="h-full bg-amber-500"
                                                    style={{ width: `${(project.batch_stats_counts.delivered / project.batch_quantity) * 100}%` }}
                                                />
                                            )}

                                            {/* Em Progresso (Azul) */}
                                            {project.batch_stats_counts && project.batch_stats_counts.in_progress > 0 && (
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${(project.batch_stats_counts.in_progress / project.batch_quantity) * 100}%` }}
                                                />
                                            )}
                                        </div>
                                        <span className="font-bold text-foreground">
                                            {project.videos_approved || 0}/{project.batch_quantity}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Prazo */}
                            <div className={`flex items-center gap-1.5 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                <Calendar className="w-4 h-4" />
                                <span className={isOverdue ? 'font-semibold' : ''}>
                                    {isOverdue ? '⚠️ Atrasado' : `Prazo ${deadlineText}`}
                                </span>
                            </div>

                            {/* Valor */}
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-semibold text-foreground">
                                    R$ {project.base_price.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card do Outro Usuário */}
                    {otherUser.name && (
                        <div className="shrink-0 flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3 border border-border">
                            {otherUser.photo ? (
                                <img
                                    src={otherUser.photo}
                                    alt={otherUser.name}
                                    className="w-11 h-11 rounded-full border-2 border-background object-cover"
                                />
                            ) : (
                                <div className="w-11 h-11 bg-muted rounded-full flex items-center justify-center border-2 border-background">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-muted-foreground font-medium">
                                    {otherUser.label}
                                </div>
                                <div className="font-semibold text-foreground">
                                    {otherUser.name}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Se não tem editor atribuído */}
                    {userRole === 'creator' && !project.editor_name && (
                        <div className="shrink-0 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-800">
                            <div className="w-11 h-11 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                    Editor
                                </div>
                                <div className="font-semibold text-amber-700 dark:text-amber-300">
                                    Aguardando...
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
