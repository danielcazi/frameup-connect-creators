import { Info } from 'lucide-react';
import { BatchDeliveryMode, calculateBatchPricing } from '@/types';

interface BatchQuantitySelectorProps {
    isBatch: boolean;
    quantity: number;
    deliveryMode: BatchDeliveryMode;
    basePrice: number;
    onUpdate: (updates: {
        is_batch?: boolean;
        batch_quantity?: number;
        batch_delivery_mode?: BatchDeliveryMode;
    }) => void;
}

export function BatchQuantitySelector({
    isBatch,
    quantity,
    deliveryMode,
    basePrice,
    onUpdate
}: BatchQuantitySelectorProps) {

    // Calcular preços apenas se for lote
    const pricing = isBatch ? calculateBatchPricing(basePrice, quantity, deliveryMode) : null;

    return (
        <section className="animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
                4. Quantidade de Vídeos
            </h3>

            {/* Seletor Individual vs Lote */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Opção Individual */}
                <button
                    type="button"
                    onClick={() => onUpdate({ is_batch: false, batch_quantity: 1 })}
                    className={`border-2 rounded-xl p-6 transition-all text-left ${!isBatch
                            ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                            : 'border-border hover:border-muted-foreground/50 bg-card'
                        }`}
                >
                    <div className="text-4xl mb-3">📹</div>
                    <div className="font-semibold text-lg text-foreground">Projeto Individual</div>
                    <div className="text-sm text-muted-foreground mt-1">1 vídeo único</div>
                </button>

                {/* Opção Lote */}
                <button
                    type="button"
                    onClick={() => onUpdate({ is_batch: true, batch_quantity: 4, batch_delivery_mode: 'sequential' })}
                    className={`border-2 rounded-xl p-6 transition-all text-left ${isBatch
                            ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                            : 'border-border hover:border-muted-foreground/50 bg-card'
                        }`}
                >
                    <div className="text-4xl mb-3">📦</div>
                    <div className="font-semibold text-lg text-foreground">Projeto em Lote</div>
                    <div className="text-sm text-muted-foreground mt-1">4 a 20 vídeos</div>
                    <div className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full">
                        💰 Até 10% OFF
                    </div>
                </button>
            </div>

            {/* Configurações do Lote (só aparece se isBatch) */}
            {isBatch && (
                <div className="border-2 border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/5 to-background space-y-6">

                    {/* Seletor de Quantidade */}
                    <div>
                        <label className="block text-sm font-semibold mb-3 text-foreground">
                            Quantos vídeos você precisa?
                        </label>
                        <div className="flex items-center gap-4 flex-wrap">
                            <input
                                type="number"
                                min={4}
                                max={20}
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 4 && val <= 20) {
                                        onUpdate({ batch_quantity: val });
                                    }
                                }}
                                className="w-24 px-4 py-2 border-2 border-input rounded-lg text-center text-lg font-semibold focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background"
                            />
                            <span className="text-muted-foreground">vídeos</span>

                            {pricing && pricing.discountPercent > 0 && (
                                <div className="ml-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                                    🎉 {pricing.discountPercent}% de desconto
                                </div>
                            )}
                        </div>

                        {/* Escala de descontos */}
                        <div className="mt-3 flex gap-2 text-xs">
                            <span className={`px-2 py-1 rounded ${quantity >= 4 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                4-6: 5% OFF
                            </span>
                            <span className={`px-2 py-1 rounded ${quantity >= 7 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                7-9: 8% OFF
                            </span>
                            <span className={`px-2 py-1 rounded ${quantity >= 10 ? 'bg-green-100 dark:bg-green-900/30 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                10+: 10% OFF
                            </span>
                        </div>
                    </div>

                    {/* Modo de Entrega */}
                    <div>
                        <label className="block text-sm font-semibold mb-3 text-foreground">
                            Como deseja receber os vídeos?
                        </label>

                        <div className="space-y-3">
                            {/* Sequencial */}
                            <label
                                className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${deliveryMode === 'sequential'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:bg-muted/50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_mode"
                                    value="sequential"
                                    checked={deliveryMode === 'sequential'}
                                    onChange={() => onUpdate({ batch_delivery_mode: 'sequential' })}
                                    className="mt-1 accent-primary"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold flex items-center gap-2 text-foreground">
                                        📅 Entregas Sequenciais
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            Recomendado
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Editor entrega 1 vídeo por vez. Você aprova e ele passa para o próximo.
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Editor pode trabalhar em vários simultaneamente, mas entrega em ordem.
                                    </div>
                                </div>
                            </label>

                            {/* Simultâneo */}
                            <label
                                className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${deliveryMode === 'simultaneous'
                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                        : 'border-border hover:bg-muted/50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="delivery_mode"
                                    value="simultaneous"
                                    checked={deliveryMode === 'simultaneous'}
                                    onChange={() => onUpdate({ batch_delivery_mode: 'simultaneous' })}
                                    className="mt-1 accent-amber-500"
                                />
                                <div className="flex-1">
                                    <div className="font-semibold flex items-center gap-2 text-foreground">
                                        ⚡ Entrega Simultânea
                                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                                            +20%
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Editor entrega todos os {quantity} vídeos juntos no prazo único.
                                    </div>
                                    {pricing && (
                                        <div className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium">
                                            ⚠️ Taxa de urgência: +R$ {pricing.urgencyFee.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Resumo de Economia */}
                    {pricing && pricing.savings > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-foreground">
                                    💰 Economia Total
                                </span>
                                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                    R$ {pricing.savings.toFixed(2)}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Preço por vídeo: <span className="font-semibold text-foreground">R$ {pricing.pricePerVideo.toFixed(2)}</span>
                                {' '} (ao invés de R$ {basePrice.toFixed(2)})
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
