// src/components/creator/AlertBanner.tsx
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface AlertBannerProps {
    reviewCount: number;
    unreadMessages: number;
    urgentDeadlines: number;
    onReviewClick?: () => void;
    onMessagesClick?: () => void;
    onDeadlineClick?: () => void;
}

export function AlertBanner({
    reviewCount,
    unreadMessages,
    urgentDeadlines,
    onReviewClick,
    onMessagesClick,
    onDeadlineClick
}: AlertBannerProps) {
    const navigate = useNavigate();

    // Não renderizar se não houver alertas
    const hasAlerts = reviewCount > 0 || unreadMessages > 0 || urgentDeadlines > 0;
    if (!hasAlerts) return null;

    const alerts: Array<{
        icon: React.ReactNode;
        text: string;
        count: number;
        color: string;
        onClick: () => void;
    }> = [];

    // Prioridade 1: Revisões
    if (reviewCount > 0) {
        alerts.push({
            icon: <Clock className="w-4 h-4" />,
            text: `${reviewCount} vídeo${reviewCount > 1 ? 's' : ''} aguardando revisão`,
            count: reviewCount,
            color: 'text-orange-600 dark:text-orange-400',
            onClick: () => onReviewClick?.() || navigate('/creator/projects?filter=in_review')
        });
    }

    // Prioridade 2: Mensagens
    if (unreadMessages > 0) {
        alerts.push({
            icon: <MessageSquare className="w-4 h-4" />,
            text: `${unreadMessages} mensagem${unreadMessages > 1 ? 'ns' : ''} não lida${unreadMessages > 1 ? 's' : ''}`,
            count: unreadMessages,
            color: 'text-blue-600 dark:text-blue-400',
            onClick: () => onMessagesClick?.() || navigate('/creator/messages')
        });
    }

    // Prioridade 3: Deadlines
    if (urgentDeadlines > 0) {
        alerts.push({
            icon: <AlertCircle className="w-4 h-4" />,
            text: `${urgentDeadlines} deadline${urgentDeadlines > 1 ? 's' : ''} em menos de 48h`,
            count: urgentDeadlines,
            color: 'text-red-600 dark:text-red-400',
            onClick: () => onDeadlineClick?.() || navigate('/creator/projects?sort=deadline')
        });
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Ícone de Alerta */}
                <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Atenção:
                    </span>
                </div>

                {/* Lista de Alertas (inline) */}
                <div className="flex items-center flex-wrap gap-4">
                    {alerts.map((alert, index) => (
                        <button
                            key={index}
                            onClick={alert.onClick}
                            className={cn(
                                "flex items-center gap-1.5 text-sm font-medium transition-colors",
                                "hover:underline cursor-pointer",
                                alert.color
                            )}
                        >
                            {alert.icon}
                            <span>{alert.text}</span>
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AlertBanner;
