import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';

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

interface PricingSummaryCardProps {
  pricing: PricingData;
}

export function PricingSummaryCard({ pricing }: PricingSummaryCardProps) {
  if (pricing.loading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-12 w-32 mx-auto" />
          <Skeleton className="h-px w-full my-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }
  
  if (pricing.error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p className="text-sm">{pricing.error}</p>
        </div>
      </Card>
    );
  }
  
  if (pricing.base_price === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Selecione tipo, estilo e duração para calcular o preço</p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">Valor Calculado</p>
        <h2 className="text-4xl font-bold text-primary">
          R$ {pricing.total_paid_by_creator.toFixed(2)}
        </h2>
      </div>
      
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Edição base</span>
          <span className="font-semibold text-foreground">R$ {pricing.base_price.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taxa da plataforma (5%)</span>
          <span className="font-semibold text-foreground">R$ {pricing.platform_fee.toFixed(2)}</span>
        </div>
        
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-semibold text-foreground">TOTAL A PAGAR</span>
          <span className="font-bold text-lg text-primary">
            R$ {pricing.total_paid_by_creator.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-foreground space-y-1">
            <p className="font-semibold">
              O editor receberá R$ {pricing.editor_receives.toFixed(2)}
            </p>
            <p className="text-muted-foreground">
              Entrega estimada: {pricing.estimated_delivery_days} dias úteis
            </p>
          </div>
        </div>
      </div>
      
      {pricing.features.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-foreground mb-3">Incluído neste pacote:</p>
          <ul className="space-y-2">
            {pricing.features.map((feature, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
