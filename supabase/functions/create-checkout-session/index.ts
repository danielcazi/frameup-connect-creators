import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('APP_URL');

    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not found in environment');
      throw new Error('Stripe configuration missing');
    }

    if (!appUrl) {
      console.error('APP_URL not found in environment');
      throw new Error('APP_URL configuration missing');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    const { priceId, userId, userEmail } = await req.json();

    if (!priceId || !userId || !userEmail) {
      throw new Error('Missing required fields: priceId, userId, or userEmail');
    }

    console.log('Creating checkout session for:', { priceId, userId, userEmail });

    // Create or retrieve customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId,
        },
      });
      console.log('Created new customer:', customer.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/editor/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/editor/pricing?canceled=true`,
      metadata: {
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
        },
      },
    });

    console.log('Checkout session created:', session.id);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
