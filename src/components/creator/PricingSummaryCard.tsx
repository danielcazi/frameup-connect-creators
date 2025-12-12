import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingData } from "@/hooks/useProjectPricing";
import { Check, Info } from "lucide-react";

interface PricingSummaryCardProps {
    pricing: PricingData;
}

export function PricingSummaryCard({ pricing }: PricingSummaryCardProps) {
    if (pricing.loading) {
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

    if (pricing.error) {
        return (
            <Card className="w-full border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                    <div className="text-center text-destructive">
                        <p>{pricing.error}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (pricing.base_price === 0) {
        return null;
    }

    return (
        <Card className="w-full border-primary/20 shadow-lg">
            <CardContent className="pt-6">
                <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Valor Calculado</p>
                    <h2 className="text-4xl font-bold text-primary">
                        R$ {pricing.total_paid_by_creator.toFixed(2)}
                    </h2>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Edição base</span>
                        <span className="font-semibold">R$ {pricing.base_price.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            Taxa da plataforma ({pricing.platform_fee_percent || 15}%)
                        </span>
                        <span className="font-semibold">R$ {pricing.platform_fee.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-border pt-2 flex justify-between items-center">
                        <span className="font-semibold">TOTAL A PAGAR</span>
                        <span className="font-bold text-lg text-primary">
                            R$ {pricing.total_paid_by_creator.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary mt-0.5" />
                        <div className="text-xs text-primary/80">
                            <p className="font-semibold mb-1">
                                O editor receberá R$ {pricing.editor_receives.toFixed(2)}
                            </p>
                            <p>Entrega estimada: {pricing.estimated_delivery_days} dias úteis</p>
                        </div>
                    </div>
                </div>

                {pricing.features.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-foreground mb-2">Incluído neste pacote:</p>
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
