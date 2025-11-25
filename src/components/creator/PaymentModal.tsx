import { useState } from 'react';
import {
    useStripe,
    useElements,
    PaymentElement,
    Elements,
} from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PaymentFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

function PaymentForm({ onSuccess, onCancel }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL where the user is redirected after the payment
                return_url: `${window.location.origin}/creator/dashboard?payment_success=true`,
            },
            redirect: 'if_required', // Avoid redirect if possible for smoother UX
        });

        if (error) {
            toast({
                variant: 'destructive',
                title: 'Erro no pagamento',
                description: error.message || 'Ocorreu um erro ao processar o pagamento.',
            });
            setIsLoading(false);
        } else {
            // Payment succeeded (if redirect didn't happen)
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !stripe || !elements}>
                    {isLoading ? 'Processando...' : 'Pagar Agora'}
                </Button>
            </div>
        </form>
    );
}

interface PaymentModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    clientSecret: string;
    onSuccess: () => void;
}

export function PaymentModal({
    isOpen,
    onOpenChange,
    clientSecret,
    onSuccess,
}: PaymentModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Pagamento Seguro</DialogTitle>
                    <DialogDescription>
                        Insira os dados do seu cartão para finalizar a publicação do projeto.
                    </DialogDescription>
                </DialogHeader>
                {clientSecret && (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                        <PaymentForm onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
                    </Elements>
                )}
            </DialogContent>
        </Dialog>
    );
}
