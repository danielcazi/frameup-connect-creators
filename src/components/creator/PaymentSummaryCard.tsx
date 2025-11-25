import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Info } from 'lucide-react';

interface PaymentSummaryCardProps {
    project: any;
    onPayment: (projectId: string) => Promise<void>;
}

export function PaymentSummaryCard({ project, onPayment }: PaymentSummaryCardProps) {
    const [processing, setProcessing] = useState(false);

    const handlePayment = async () => {
        setProcessing(true);
        try {
            await onPayment(project.id);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="sticky top-24">
            <Card className="p-6 border-primary/20 shadow-lg">
                <h3 className="text-lg font-semibold mb-6">Resumo do Pagamento</h3>

                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Edição base</span>
                        <span className="font-semibold">
                            R$ {project.base_price.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa da plataforma (5%)</span>
                        <span className="font-semibold">
                            R$ {project.platform_fee.toFixed(2)}
                        </span>
                    </div>

                    <div className="border-t pt-4 flex justify-between items-end">
                        <span className="font-bold text-lg">TOTAL</span>
                        <span className="font-bold text-3xl text-primary">
                            R$ {project.total_paid_by_creator.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-6 border border-blue-100 dark:border-blue-900">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-900 dark:text-blue-300">
                            <p className="font-semibold mb-2">Como funciona:</p>
                            <ul className="space-y-1.5 list-disc pl-3">
                                <li>Seu pagamento fica retido na plataforma</li>
                                <li>Editores se candidatam ao projeto</li>
                                <li>Você escolhe o melhor editor</li>
                                <li>Pagamento liberado após sua aprovação</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <Button
                    className="w-full text-lg py-6"
                    size="lg"
                    disabled={processing}
                    onClick={handlePayment}
                >
                    {processing ? 'Processando...' : '💳 Pagar e Publicar Projeto'}
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Pagamento 100% seguro via Stripe</span>
                </div>
            </Card>
        </div>
    );
}
