import React from 'react';
import { ArrowRight, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, getAlertConfig } from '../../../utils/alertHelpers';

interface DashboardAlertsProps {
    alerts: Alert[];
    isLoading?: boolean;
}

const AlertIcon = ({ type, className }: { type: Alert['type']; className?: string }) => {
    switch (type) {
        case 'review':
            return <AlertCircle className={className} />;
        case 'message':
            return <MessageSquare className={className} />;
        case 'deadline':
            return <Clock className={className} />;
        default:
            return <AlertCircle className={className} />;
    }
};

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts, isLoading = false }) => {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="space-y-4 mb-8">
                {[1, 2].map((i) => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (alerts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4 mb-8">
            {alerts.map((alert) => {
                const config = getAlertConfig(alert.type);

                return (
                    <div
                        key={alert.id}
                        className={`relative overflow-hidden rounded-xl border ${config.borderColor} ${config.bgColor} p-1 transition-all hover:shadow-md`}
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-20" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/10 ${config.textColor}`}>
                                    <AlertIcon type={alert.type} className="w-6 h-6" />
                                </div>

                                <div>
                                    <h3 className={`font-semibold text-lg ${config.textColor}`}>
                                        {alert.title}
                                    </h3>

                                    <div className="mt-2 space-y-1">
                                        {alert.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                                                <span>{item.text}</span>
                                                {item.timestamp && (
                                                    <span className="text-xs opacity-60">
                                                        • {item.timestamp.toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {alert.actionLabel && (
                                <button
                                    onClick={() => alert.actionUrl ? navigate(alert.actionUrl) : undefined}
                                    className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    bg-white dark:bg-gray-800 shadow-sm hover:bg-opacity-90 transition-colors
                    ${config.textColor} whitespace-nowrap
                  `}
                                >
                                    {alert.actionLabel}
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
