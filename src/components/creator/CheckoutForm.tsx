import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface CheckoutFormProps {
    projectId: string;
    amount: number;
}

const ERROR_MESSAGES: Record<string, string> = {
    'card_declined': 'Cartão recusado. Por favor, tente outro cartão.',
    'insufficient_funds': 'Saldo insuficiente. Verifique seu limite ou tente outro cartão.',
    'expired_card': 'Cartão expirado. Por favor, use um cartão válido.',
    'incorrect_cvc': 'Código de segurança incorreto.',
    'processing_error': 'Erro ao processar o pagamento. Tente novamente em alguns minutos.',
    'rate_limit': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
};

function getUserFriendlyError(stripeError: any): string {
    if (stripeError.type === 'card_error') {
        return ERROR_MESSAGES[stripeError.code] || stripeError.message;
    }
    return stripeError.message || 'Ocorreu um erro desconhecido. Tente novamente.';
}

export default function CheckoutForm({ projectId, amount }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setProcessing(true);
        setErrorMessage('');

        try {
            // Confirmar pagamento
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/creator/project/${projectId}/payment-success`,
                },
                redirect: 'if_required'
            });

            if (error) {
                const friendlyMessage = getUserFriendlyError(error);
                setErrorMessage(friendlyMessage);
                setProcessing(false);

                toast({
                    variant: 'destructive',
                    title: 'Erro no pagamento',
                    description: friendlyMessage
                });
            } else if (paymentIntent) {
                if (paymentIntent.status === 'requires_capture') {
                    // Pagamento autorizado (escrow)
                    toast({
                        title: 'Pagamento autorizado!',
                        description: 'Finalizando publicação do projeto...'
                    });
                    navigate(`/creator/project/${projectId}/payment-success`);
                } else if (paymentIntent.status === 'succeeded') {
                    // Pagamento capturado imediatamente
                    toast({
                        title: 'Pagamento realizado!',
                        description: 'Projeto publicado com sucesso.'
                    });
                    navigate(`/creator/project/${projectId}/payment-success`);
                } else if (paymentIntent.status === 'requires_action') {
                    // 3D Secure ou outra ação necessária (geralmente tratado pelo stripe.js automaticamente, mas bom ter handler)
                    toast({
                        title: 'Ação necessária',
                        description: 'Por favor, complete a autenticação do seu banco.'
                    });
                    // O stripe.js geralmente lida com o fluxo de redirecionamento para 3DS, então talvez não chegue aqui se redirect: 'always' fosse usado.
                    // Com 'if_required', ele pode pedir ação. Se for redirect, a página recarrega.
                } else {
                    setProcessing(false);
                    setErrorMessage(`Estado do pagamento não esperado: ${paymentIntent.status}`);
                }
            }
        } catch (err: any) {
            console.error('Erro inesperado:', err);
            setErrorMessage('Ocorreu um erro de conexão. Verifique sua internet e tente novamente.');
            setProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <PaymentElement />

            {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">Erro no Pagamento</p>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errorMessage}</p>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-3 border-red-200 hover:bg-red-100 text-red-700 dark:border-red-800 dark:hover:bg-red-900/40 dark:text-red-300"
                            onClick={() => setErrorMessage('')}
                        >
                            <RefreshCw className="w-3 h-3 mr-2" />
                            Tentar Novamente
                        </Button>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <Button
                    type="submit"
                    className="w-full text-lg py-6 font-semibold shadow-md transition-all hover:scale-[1.01]"
                    size="lg"
                    disabled={!stripe || processing}
                >
                    {processing ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processando...
                        </div>
                    ) : (
                        `Pagar R$ ${amount.toFixed(2)}`
                    )}
                </Button>
            </div>

            <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                    🔒 Pagamento seguro e criptografado via Stripe
                </p>
                <div className="flex items-center justify-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all">
                    {/* Ícones simples com CSS/SVG inline para evitar dependência de imagens externas por enquanto */}
                    <div className="h-5 px-2 bg-gray-100 border rounded flex items-center text-[10px] font-bold text-blue-800">VISA</div>
                    <div className="h-5 px-2 bg-gray-100 border rounded flex items-center text-[10px] font-bold text-red-600">Mastercard</div>
                    <div className="h-5 px-2 bg-gray-100 border rounded flex items-center text-[10px] font-bold text-green-600">PIX</div>
                </div>
            </div>
        </form>
    );
}
