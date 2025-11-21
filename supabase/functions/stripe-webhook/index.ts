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
    console.error('Missing signature or webhook secret');
    return new Response('Missing signature or secret', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Stripe event received:', event.type, 'Event ID:', event.id);

    // Process events
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        // Payment authorized (requires_capture)
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentAuthorized(paymentIntent);
        break;
      }

      case 'payment_intent.succeeded': {
        // Payment complete
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        // Payment failed
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
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400 }
    );
  }
});

async function handlePaymentAuthorized(paymentIntent: Stripe.PaymentIntent) {
  const { project_id } = paymentIntent.metadata;

  console.log(`Payment authorized for project: ${project_id}`, {
    amount: paymentIntent.amount,
    status: paymentIntent.status
  });

  // 1. Update project
  const { error: updateError } = await supabase
    .from('projects')
    .update({
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      status: 'open', // Publish to marketplace
      updated_at: new Date().toISOString()
    })
    .eq('id', project_id);

  if (updateError) {
    console.error('Error updating project:', updateError);
    throw updateError;
  }

  // 2. Register transaction
  const { error: transactionError } = await supabase
    .from('payment_transactions')
    .insert({
      project_id,
      transaction_type: 'payment',
      amount: paymentIntent.amount / 100,
      stripe_id: paymentIntent.id,
      status: 'succeeded',
      metadata: paymentIntent.metadata
    });

  if (transactionError) {
    console.error('Error creating transaction:', transactionError);
    // Don't throw - project update succeeded
  }

  console.log(`✅ Project ${project_id} published to marketplace`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Case where payment is captured immediately
  // (shouldn't happen with capture_method: 'manual')
  console.log('Payment succeeded event received for:', paymentIntent.id);
  await handlePaymentAuthorized(paymentIntent);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { project_id } = paymentIntent.metadata;

  console.log(`❌ Payment failed for project: ${project_id}`, {
    error: paymentIntent.last_payment_error?.message
  });

  // Register failure
  const { error } = await supabase
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

  if (error) {
    console.error('Error logging failed transaction:', error);
  }
}
