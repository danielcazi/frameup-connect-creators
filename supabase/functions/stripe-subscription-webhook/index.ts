import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('No signature provided');
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Webhook event received:', event.type);

    // Processar eventos de assinatura
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription') {
          const userId = session.metadata?.user_id;
          const subscriptionId = session.subscription as string;

          if (!userId || !subscriptionId) {
            console.error('Missing user_id or subscription_id in session metadata');
            break;
          }

          // Buscar detalhes da subscription no Stripe
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          // Criar registro de assinatura
          const { error: insertError } = await supabase
            .from('editor_subscriptions')
            .insert({
              editor_id: userId,
              plan_id: session.metadata?.plan_id || 'premium',
              status: 'active',
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: false,
            });

          if (insertError) {
            console.error('Error inserting subscription:', insertError);
            throw insertError;
          }

          console.log(`✅ Subscription created for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Determinar novo status
        let newStatus: 'active' | 'past_due' | 'cancelled' | 'expired' = 'active';
        
        if (subscription.status === 'past_due') {
          newStatus = 'past_due';
        } else if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
          newStatus = 'cancelled';
        } else if (subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
          newStatus = 'expired';
        }

        // Atualizar assinatura
        const { error: updateError } = await supabase
          .from('editor_subscriptions')
          .update({
            status: newStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('Error updating subscription:', updateError);
          throw updateError;
        }

        console.log(`✅ Subscription updated: ${subscription.id} - Status: ${newStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Marcar como expirada
        const { error: deleteError } = await supabase
          .from('editor_subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (deleteError) {
          console.error('Error deleting subscription:', deleteError);
          throw deleteError;
        }

        console.log(`✅ Subscription deleted: ${subscription.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Marcar como past_due
          const { error: paymentError } = await supabase
            .from('editor_subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId);

          if (paymentError) {
            console.error('Error updating payment status:', paymentError);
            throw paymentError;
          }

          console.log(`⚠️ Payment failed for subscription: ${subscriptionId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Reativar se estava past_due
          const { error: successError } = await supabase
            .from('editor_subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)
            .eq('status', 'past_due');

          if (successError) {
            console.error('Error reactivating subscription:', successError);
            throw successError;
          }

          console.log(`✅ Payment succeeded for subscription: ${subscriptionId}`);
        }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
