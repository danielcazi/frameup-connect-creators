import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    CheckCircle,
    XCircle,
    Clock,
    FileVideo,
    ExternalLink,
    MessageSquare,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Delivery {
    id: string;
    version: number;
    video_url: string;
    status: string;
    notes?: string;
    creator_feedback?: string;
    delivered_at: string;
    reviewed_at?: string;
}

interface DeliveryHistoryProps {
    deliveries: Delivery[];
    userType: 'creator' | 'editor';
}

function DeliveryHistory({ deliveries, userType }: DeliveryHistoryProps) {
    function getStatusIcon(status: string) {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'revision_requested':
                return <XCircle className="w-5 h-5 text-yellow-600" />;
            case 'pending_review':
                return <Clock className="w-5 h-5 text-blue-600" />;
            default:
                return <FileVideo className="w-5 h-5 text-gray-600" />;
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Aprovado</Badge>;
            case 'revision_requested':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">Revisão Solicitada</Badge>;
            case 'pending_review':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Em Revisão</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    }

    function formatDate(date: string) {
        return format(new Date(date), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
    }

    return (
        <div className="bg-card rounded-lg border shadow-sm p-6">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <FileVideo className="w-6 h-6 text-muted-foreground" />
                Histórico de Entregas ({deliveries.length})
            </h3>

            <div className="space-y-6">
                {deliveries.map((delivery, index) => (
                    <div
                        key={delivery.id}
                        className={`relative ${index !== deliveries.length - 1 ? 'pb-6' : ''
                            }`}
                    >
                        {/* Timeline Line */}
                        {index !== deliveries.length - 1 && (
                            <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                        )}

                        <div className="flex gap-4">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-full flex items-center justify-center relative z-10 border border-border">
                                {getStatusIcon(delivery.status)}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg font-semibold text-foreground">
                                                Versão {delivery.version}
                                            </h4>
                                            {getStatusBadge(delivery.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Entregue em {formatDate(delivery.delivered_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Video Link */}
                                <div className="bg-muted/50 rounded-lg p-4 mb-3 border border-border">
                                    <p className="text-sm text-muted-foreground mb-2 font-medium">
                                        Link do Vídeo:
                                    </p>
                                    <a
                                        href={delivery.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-2 break-all"
                                    >
                                        <span className="truncate">{delivery.video_url}</span>
                                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                    </a>
                                </div>

                                {/* Editor Notes */}
                                {delivery.notes && (
                                    <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-4 mb-3 border border-blue-100 dark:border-blue-800">
                                        <p className="text-sm text-muted-foreground mb-2 font-medium">
                                            Notas do Editor:
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-line">
                                            {delivery.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Creator Feedback */}
                                {delivery.creator_feedback && (
                                    <div className="bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                        <div className="flex items-start gap-2 mb-2">
                                            <MessageSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-yellow-900 dark:text-yellow-500 font-medium">
                                                Feedback do Creator:
                                            </p>
                                        </div>
                                        <p className="text-sm text-yellow-800 dark:text-yellow-400 whitespace-pre-line ml-6">
                                            {delivery.creator_feedback}
                                        </p>
                                        {delivery.reviewed_at && (
                                            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2 ml-6">
                                                Revisado em {formatDate(delivery.reviewed_at)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Approved Message */}
                                {delivery.status === 'approved' && (
                                    <div className="bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                                            <p className="text-sm text-green-900 dark:text-green-500 font-medium">
                                                Vídeo aprovado pelo creator! 🎉
                                            </p>
                                        </div>
                                        {delivery.reviewed_at && (
                                            <p className="text-xs text-green-700 dark:text-green-600 mt-1 ml-6">
                                                Aprovado em {formatDate(delivery.reviewed_at)}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DeliveryHistory;
