import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe no frontend
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Inicializar Stripe no frontend apenas se a chave existir
export const stripePromise = stripeKey
    ? loadStripe(stripeKey)
    : (console.warn('Stripe key not found'), Promise.resolve(null));

// Types
export interface PaymentIntentData {
    amount: number;
    currency: string;
    metadata: {
        project_id: string;
        creator_id: string;
        editor_receives: number;
    };
}
