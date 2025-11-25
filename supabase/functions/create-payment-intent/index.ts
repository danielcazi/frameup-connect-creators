import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { project_id, amount, creator_id, editor_receives } = await req.json();

        // Validações
        if (!project_id || !amount || !creator_id) {
            throw new Error('Dados obrigatórios faltando');
        }

        if (amount < 0.50) { // Mínimo R$ 0.50
            throw new Error('Valor mínimo é R$ 0.50');
        }

        // Criar Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Converter para centavos
            currency: 'brl',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                project_id,
                creator_id,
                editor_receives: Math.round(editor_receives * 100),
            },
            description: `FRAMEUP - Projeto #${project_id}`,
            capture_method: 'manual', // Captura manual (escrow)
        });

        return new Response(
            JSON.stringify({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
