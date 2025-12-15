// src/components/creator/MetricCards.tsx
import { Film, Clock, CheckCircle2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardsProps {
    inProduction: number;
    awaitingReview: number;
    completed: number;
    total: number;
    isLoading?: boolean;
}

interface MetricCardProps {
    icon: React.ReactNode;
    iconBgColor: string;
    value: number;
    label: string;
    sublabel?: string;
    highlight?: boolean;
    isLoading?: boolean;
}

function MetricCard({
    icon,
    iconBgColor,
    value,
    label,
    sublabel,
    highlight = false,
    isLoading = false
}: MetricCardProps) {
    if (isLoading) {
        return (
            <div className="bg-card rounded-xl border-2 border-border p-6 animate-pulse">
                <div className={cn("w-12 h-12 rounded-full mb-4", iconBgColor, "opacity-50")} />
                <div className="h-10 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-24" />
            </div>
        );
    }

    return (
        <div
            className={cn(
                "bg-card rounded-xl border-2 p-6 transition-all hover:shadow-md",
                highlight && value > 0
                    ? "border-orange-400 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10"
                    : "border-border"
            )}
        >
            {/* Ícone */}
            <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                iconBgColor
            )}>
                {icon}
            </div>

            {/* Número Principal */}
            <div className={cn(
                "text-4xl font-bold mb-2",
                highlight && value > 0 ? "text-orange-600 dark:text-orange-400" : "text-foreground"
            )}>
                {value}
            </div>

            {/* Label */}
            <p className="text-sm font-medium text-muted-foreground">
                {label}
            </p>

            {/* Sublabel */}
            {sublabel && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                    {sublabel}
                </p>
            )}
        </div>
    );
}

export function MetricCards({
    inProduction,
    awaitingReview,
    completed,
    total,
    isLoading = false
}: MetricCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Em Produção */}
            <MetricCard
                icon={<Film className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                value={inProduction}
                label="Em Produção"
                sublabel={inProduction > 0 ? `${inProduction} vídeo${inProduction > 1 ? 's' : ''}` : undefined}
                isLoading={isLoading}
            />

            {/* Card 2: Aguardando Revisão (HIGHLIGHT) */}
            <MetricCard
                icon={<Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />}
                iconBgColor="bg-orange-100 dark:bg-orange-900/30"
                value={awaitingReview}
                label="Aguardando Revisão"
                sublabel={awaitingReview > 0 ? `${awaitingReview} vídeo${awaitingReview > 1 ? 's' : ''}` : undefined}
                highlight={true}
                isLoading={isLoading}
            />

            {/* Card 3: Concluídos */}
            <MetricCard
                icon={<CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />}
                iconBgColor="bg-green-100 dark:bg-green-900/30"
                value={completed}
                label="Concluídos"
                sublabel={completed > 0 ? `${completed} vídeo${completed > 1 ? 's' : ''}` : undefined}
                isLoading={isLoading}
            />

            {/* Card 4: Total de Projetos */}
            <MetricCard
                icon={<Package className="w-6 h-6 text-gray-600 dark:text-gray-400" />}
                iconBgColor="bg-gray-100 dark:bg-gray-900/30"
                value={total}
                label="Total de Projetos"
                isLoading={isLoading}
            />
        </div>
    );
}

export default MetricCards;
