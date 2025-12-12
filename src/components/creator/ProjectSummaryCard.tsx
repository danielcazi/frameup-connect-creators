import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Info } from "lucide-react";
import { calculateBatchPricing, BatchDeliveryMode } from "@/types";

interface PricingData {
    pricing_id: string;
    base_price: number;
    platform_fee: number;
    total_paid_by_creator: number;
    editor_receives: number;
    estimated_delivery_days: number;
    features: string[];
    loading: boolean;
    error: string | null;
}

interface ProjectSummaryCardProps {
    projectData?: any; // To accept the full project state
    pricing?: PricingData; // Legacy individual pricing
    isBatch?: boolean;
    batchQuantity?: number;
    batchDiscount?: number;
    batchVideos?: any[];
}

export function ProjectSummaryCard({
    projectData,
    pricing,
    isBatch = false,
    batchQuantity = 1,
    batchDiscount = 0
}: ProjectSummaryCardProps) {

    // Determine base values (prefer pricing object if available, otherwise projectData)
    const isLoading = pricing?.loading;
    const error = pricing?.error;
    const basePrice = pricing?.base_price || projectData?.base_price || 0;

    // If it's a batch project, calculate specific batch pricing
    const batchPricing = isBatch && basePrice > 0
        ? calculateBatchPricing(
            basePrice,
            batchQuantity,
            projectData?.batch_delivery_mode as BatchDeliveryMode || 'sequential'
        )
        : null;

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-3/4 mx-auto" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                    <div className="text-center text-destructive">
                        <p>{error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (basePrice === 0) {
        return (
            <Card className="w-full border-muted bg-muted/20">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Selecione as opções do projeto para ver o orçamento.</p>
                </CardContent>
            </Card>
        );
    }

    // Display values
    const finalTotal = batchPricing ? batchPricing.total : (pricing?.total_paid_by_creator || 0);
    const finalPlatformFee = batchPricing ? batchPricing.platformFee : (pricing?.platform_fee || 0);
    const finalEditorReceives = batchPricing ? batchPricing.editorEarningsTotal : (pricing?.editor_receives || 0);
    const estimatedDays = pricing?.estimated_delivery_days || 0;
    // For batch: estimate roughly (this logic could be more complex later)
    const batchDays = isBatch && projectData?.batch_delivery_mode === 'sequential'
        ? estimatedDays * batchQuantity
        : estimatedDays; // Simultaneous roughly same duration as single? Or maybe slight buffer. Leaving as single duration for simultaneous for now.

    return (
        <Card className="w-full border-primary/20 shadow-lg sticky top-24">
            <CardContent className="pt-6">
                <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground mb-1">
                        {isBatch ? `Total para ${batchQuantity} vídeos` : 'Valor do Projeto'}
                    </p>
                    <h2 className="text-4xl font-bold text-primary">
                        R$ {finalTotal.toFixed(2)}
                    </h2>
                    {isBatch && batchPricing && batchPricing.savings > 0 && (
                        <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Economia de R$ {batchPricing.savings.toFixed(2)}
                        </span>
                    )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                    {/* Detalhamento Individual ou Base */}
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Preço base (unid.)</span>
                        <span className="font-semibold">R$ {basePrice.toFixed(2)}</span>
                    </div>

                    {isBatch && batchPricing && (
                        <>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Desconto ({batchDiscount}%)</span>
                                <span>- R$ {(basePrice * batchQuantity * batchDiscount / 100).toFixed(2)}</span>
                            </div>

                            {projectData?.batch_delivery_mode === 'simultaneous' && (
                                <div className="flex justify-between text-sm text-amber-600">
                                    <span>Taxa Urgência (Simultâneo)</span>
                                    <span>+ R$ {batchPricing.urgencyFee.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm font-medium pt-1 border-t border-dashed border-border/50">
                                <span>Subtotal ({batchQuantity} vídeos)</span>
                                <span>R$ {batchPricing.subtotal.toFixed(2)}</span>
                            </div>
                        </>
                    )}

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa da plataforma (15%)</span>
                        <span className="font-semibold">R$ {finalPlatformFee.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-border pt-2 flex justify-between items-center">
                        <span className="font-semibold">TOTAL FINAL</span>
                        <span className="font-bold text-lg text-primary">
                            R$ {finalTotal.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary mt-0.5" />
                        <div className="text-xs text-primary/80">
                            <p className="font-semibold mb-1">
                                O editor receberá R$ {finalEditorReceives.toFixed(2)}
                            </p>
                            <p>
                                Entrega estimada: {isBatch ? batchDays : estimatedDays} dias úteis
                                {isBatch && projectData?.batch_delivery_mode === 'simultaneous' && ' (entrega simultânea)'}
                            </p>
                        </div>
                    </div>
                </div>

                {pricing?.features && pricing.features.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-foreground mb-2">Incluído (por vídeo):</p>
                        <ul className="space-y-1">
                            {pricing.features.map((feature, index) => (
                                <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <Check className="h-3 w-3 text-green-500 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
