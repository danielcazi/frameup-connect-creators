import React from 'react';
import { Play, Eye, CheckCircle, Video } from 'lucide-react';
import { DashboardMetrics } from '../../../utils/projectHelpers';

interface MetricsCardsProps {
    metrics: DashboardMetrics;
    isLoading?: boolean;
}

interface MetricCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'green' | 'gray';
    isLoading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, isLoading }) => {
    const colorStyles = {
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-100 dark:border-blue-800'
        },
        purple: {
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            text: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-100 dark:border-purple-800'
        },
        green: {
            bg: 'bg-green-50 dark:bg-green-900/20',
            text: 'text-green-600 dark:text-green-400',
            border: 'border-green-100 dark:border-green-800'
        },
        gray: {
            bg: 'bg-gray-50 dark:bg-gray-800/50',
            text: 'text-gray-600 dark:text-gray-400',
            border: 'border-gray-100 dark:border-gray-700'
        }
    };

    const style = colorStyles[color];

    return (
        <div className={`p-6 rounded-xl border ${style.border} bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${style.bg} ${style.text}`}>
                    {icon}
                </div>
                {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                ) : (
                    <span className={`text-3xl font-bold ${style.text}`}>{value}</span>
                )}
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
            </div>
        </div>
    );
};

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, isLoading = false }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
                title="Em Produção"
                value={metrics.inProduction}
                icon={<Play className="w-6 h-6" />}
                color="blue"
                isLoading={isLoading}
            />
            <MetricCard
                title="Aguardando Revisão"
                value={metrics.awaitingReview}
                icon={<Eye className="w-6 h-6" />}
                color="purple"
                isLoading={isLoading}
            />
            <MetricCard
                title="Concluídos"
                value={metrics.completed}
                icon={<CheckCircle className="w-6 h-6" />}
                color="green"
                isLoading={isLoading}
            />
            <MetricCard
                title="Total de Vídeos"
                value={metrics.total}
                icon={<Video className="w-6 h-6" />}
                color="gray"
                isLoading={isLoading}
            />
        </div>
    );
};
