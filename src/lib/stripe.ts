import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe no frontend
export const stripePromise = loadStripe(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

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
