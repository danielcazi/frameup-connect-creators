import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.6.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
        // Autenticar usuário
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Token de autorização ausente');
        }
        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            throw new Error('Não autorizado');
        }

        const { plan_name } = await req.json();

        // Validações
        if (!plan_name || !['basic', 'pro'].includes(plan_name)) {
            throw new Error('Plano inválido');
        }

        // Buscar plano
        const { data: plan, error: planError } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('name', plan_name)
            .eq('is_active', true)
            .single();

        if (planError || !plan) {
            throw new Error('Plano não encontrado');
        }

        // Verificar se usuário já tem assinatura ativa
        // Usando user_subscriptions em vez de editor_subscriptions
        const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();

        if (existingSub) {
            // Se já tem assinatura ativa, talvez queira fazer upgrade/downgrade (Customer Portal)
            // Por enquanto, bloqueamos nova assinatura direta
            throw new Error('Você já possui uma assinatura ativa');
        }

        // Buscar ou criar Stripe Customer
        let customerId: string;

        const { data: existingCustomerData } = await supabase
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .not('stripe_customer_id', 'is', null)
            .limit(1)
            .maybeSingle(); // maybeSingle evita erro se não encontrar

        if (existingCustomerData?.stripe_customer_id) {
            customerId = existingCustomerData.stripe_customer_id;
        } else {
            // Criar novo customer no Stripe
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id,
                    user_type: 'editor', // Assumindo que apenas editores assinam por enquanto
                },
            });
            customerId = customer.id;
        }

        // URL base do app (fallback para localhost se não configurado)
        const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

        // Criar Checkout Session para assinatura
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: plan.stripe_price_id,
                    quantity: 1,
                },
            ],
            success_url: `${appUrl}/editor/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/editor/pricing`, // Ajustado para página de preços
            metadata: {
                user_id: user.id,
                plan_id: plan.id,
                plan_name: plan.name,
            },
            subscription_data: {
                metadata: {
                    user_id: user.id,
                    plan_id: plan.id,
                    plan_name: plan.name,
                },
            },
        });

        return new Response(
            JSON.stringify({
                sessionId: session.id,
                url: session.url,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );
    } catch (error: any) {
        console.error('Error creating subscription:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
});
