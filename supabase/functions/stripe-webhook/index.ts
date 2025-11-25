import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
        return new Response('Missing signature or secret', { status: 400 });
    }

    try {
        const body = await req.text();
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

        console.log('Stripe event received:', event.type);

        // Processar eventos
        switch (event.type) {
            case 'payment_intent.amount_capturable_updated': {
                // Pagamento autorizado (requires_capture)
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentAuthorized(paymentIntent);
                break;
            }

            case 'payment_intent.succeeded': {
                // Pagamento completo
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentSucceeded(paymentIntent);
                break;
            }

            case 'payment_intent.payment_failed': {
                // Pagamento falhou
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                await handlePaymentFailed(paymentIntent);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400 }
        );
    }
});

async function handlePaymentAuthorized(paymentIntent: Stripe.PaymentIntent) {
    const { project_id } = paymentIntent.metadata;

    console.log(`Payment authorized for project: ${project_id}`);

    // 1. Atualizar projeto
    const { error: updateError } = await supabase
        .from('projects')
        .update({
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            status: 'open', // Publicar no marketplace
            updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

    if (updateError) {
        console.error('Error updating project:', updateError);
        throw updateError;
    }

    // 2. Registrar transação
    await supabase
        .from('payment_transactions')
        .insert({
            project_id,
            transaction_type: 'payment',
            amount: paymentIntent.amount / 100,
            stripe_id: paymentIntent.id,
            status: 'succeeded',
            metadata: paymentIntent.metadata
        });

    console.log(`Project ${project_id} published to marketplace`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    // Caso o pagamento seja capturado imediatamente
    // (não deveria acontecer com capture_method: 'manual')
    await handlePaymentAuthorized(paymentIntent);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    const { project_id } = paymentIntent.metadata;

    console.log(`Payment failed for project: ${project_id}`);

    // Registrar falha
    await supabase
        .from('payment_transactions')
        .insert({
            project_id,
            transaction_type: 'payment',
            amount: paymentIntent.amount / 100,
            stripe_id: paymentIntent.id,
            status: 'failed',
            metadata: {
                ...paymentIntent.metadata,
                error: paymentIntent.last_payment_error?.message
            }
        });
}
