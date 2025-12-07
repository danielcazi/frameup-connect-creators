import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
        const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY não configurada');
        }

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
            .single();

        if (planError || !plan) {
            throw new Error('Plano não encontrado');
        }

        if (!plan.stripe_price_id) {
            throw new Error('Plano sem Price ID configurado');
        }

        // Verificar se usuário já tem assinatura ativa
        const { data: existingSub } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

        if (existingSub) {
            throw new Error('Você já possui uma assinatura ativa');
        }

        // Buscar ou criar Stripe Customer usando fetch direto
        let customerId: string;

        const { data: existingCustomerData } = await supabase
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .not('stripe_customer_id', 'is', null)
            .limit(1)
            .maybeSingle();

        if (existingCustomerData?.stripe_customer_id) {
            customerId = existingCustomerData.stripe_customer_id;
        } else {
            // Criar novo customer no Stripe via API direta
            const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'email': user.email || '',
                    'metadata[user_id]': user.id,
                    'metadata[user_type]': 'editor',
                }),
            });

            if (!customerResponse.ok) {
                const errorData = await customerResponse.json();
                throw new Error(`Erro ao criar customer: ${errorData.error?.message || 'Erro desconhecido'}`);
            }

            const customer = await customerResponse.json();
            customerId = customer.id;
        }

        // Criar Checkout Session via API direta
        const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'customer': customerId,
                'mode': 'subscription',
                'payment_method_types[0]': 'card',
                'line_items[0][price]': plan.stripe_price_id,
                'line_items[0][quantity]': '1',
                'success_url': `${appUrl}/editor/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
                'cancel_url': `${appUrl}/editor/subscription/plans`,
                'metadata[user_id]': user.id,
                'metadata[plan_id]': plan.id,
                'metadata[plan_name]': plan.name,
                'subscription_data[metadata][user_id]': user.id,
                'subscription_data[metadata][plan_id]': plan.id,
                'subscription_data[metadata][plan_name]': plan.name,
            }),
        });

        if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json();
            throw new Error(`Erro ao criar checkout: ${errorData.error?.message || 'Erro desconhecido'}`);
        }

        const session = await sessionResponse.json();

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
