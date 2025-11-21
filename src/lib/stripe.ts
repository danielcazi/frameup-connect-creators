import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe on the frontend
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

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface CreatePaymentIntentRequest {
  project_id: string;
  amount: number;
  creator_id: string;
  editor_receives: number;
}
