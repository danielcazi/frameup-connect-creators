// src/components/project/BatchSummaryCard.tsx
import { Package, Clock, CheckCircle2, Eye, RefreshCw, PlayCircle } from 'lucide-react';
import { BatchStats } from '@/utils/batchHelpers';

interface BatchSummaryCardProps {
    stats: BatchStats;
    deliveryMode: 'sequential' | 'simultaneous';
}

export function BatchSummaryCard({ stats, deliveryMode }: BatchSummaryCardProps) {
    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 
                    border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">
                            Lote de {stats.total} Vídeos
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {deliveryMode === 'sequential' ? '📅 Entrega Sequencial' : '⚡ Entrega Simultânea'}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">
                        {stats.approved}/{stats.total}
                    </div>
                    <p className="text-xs text-muted-foreground">vídeos aprovados</p>
                </div>
            </div>

            {/* Barra de Progresso Visual */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Progresso do Lote</span>
                    <span className="font-bold text-primary">{stats.percentComplete}%</span>
                </div>
                <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden flex">
                    {/* Aprovados (Verde) */}
                    {stats.approved > 0 && (
                        <div
                            className="h-full bg-green-500 hover:bg-green-600 transition-colors"
                            style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                            title={`Aprovados: ${stats.approved}`}
                        />
                    )}

                    {/* Aguardando Revisão / Em Revisão (Laranja/Amarelo) */}
                    {(stats.awaitingReview + stats.inRevision) > 0 && (
                        <div
                            className="h-full bg-amber-500 hover:bg-amber-600 transition-colors"
                            style={{ width: `${((stats.awaitingReview + stats.inRevision) / stats.total) * 100}%` }}
                            title={`Em Revisão: ${stats.awaitingReview + stats.inRevision}`}
                        />
                    )}

                    {/* Em Progresso (Azul) */}
                    {stats.inProgress > 0 && (
                        <div
                            className="h-full bg-blue-500 hover:bg-blue-600 transition-colors"
                            style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
                            title={`Em Progresso: ${stats.inProgress}`}
                        />
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox
                    icon={<Clock className="w-4 h-4" />}
                    label="Pendentes"
                    value={stats.pending}
                    colorClass="text-gray-500 dark:text-gray-400"
                    bgClass="bg-gray-100/50 dark:bg-gray-800/50"
                />
                <StatBox
                    icon={<PlayCircle className="w-4 h-4" />}
                    label="Em Progresso"
                    value={stats.inProgress}
                    colorClass="text-blue-600 dark:text-blue-400"
                    bgClass="bg-blue-100/50 dark:bg-blue-900/30"
                />
                <StatBox
                    icon={<Eye className="w-4 h-4" />}
                    label="Para Revisar"
                    value={stats.awaitingReview}
                    colorClass="text-orange-600 dark:text-orange-400"
                    bgClass="bg-orange-100/50 dark:bg-orange-900/30"
                />
                <StatBox
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    label="Aprovados"
                    value={stats.approved}
                    colorClass="text-green-600 dark:text-green-400"
                    bgClass="bg-green-100/50 dark:bg-green-900/30"
                />
            </div>

            {/* Alerta se houver vídeos para revisar */}
            {stats.awaitingReview > 0 && (
                <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-700 dark:text-orange-400 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        <span>
                            Você tem <strong>{stats.awaitingReview} vídeo{stats.awaitingReview > 1 ? 's' : ''}</strong> aguardando sua revisão!
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}

// Componente auxiliar para as caixas de estatísticas
interface StatBoxProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    colorClass: string;
    bgClass: string;
}

function StatBox({ icon, label, value, colorClass, bgClass }: StatBoxProps) {
    return (
        <div className={`${bgClass} rounded-lg p-3 text-center`}>
            <div className={`${colorClass} flex items-center justify-center gap-1 text-xs mb-1`}>
                {icon}
                <span>{label}</span>
            </div>
            <div className={`text-xl font-bold ${colorClass}`}>
                {value}
            </div>
        </div>
    );
}

export default BatchSummaryCard;
