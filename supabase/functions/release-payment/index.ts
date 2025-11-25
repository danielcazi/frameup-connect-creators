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
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { project_id } = await req.json();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Buscar projeto
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .select(`
        id,
        price,
        stripe_payment_intent_id,
        assigned_editor_id,
        users!projects_assigned_editor_id_fkey (
          email
        )
      `)
            .eq('id', project_id)
            .eq('status', 'completed')
            .eq('payment_status', 'released')
            .single();

        if (projectError || !project) {
            console.error('Project error:', projectError);
            throw new Error('Projeto não encontrado ou não está pronto para pagamento');
        }

        // 2. Buscar ou criar Stripe Connect Account do editor
        // NOTA: Isso requer que editor tenha configurado conta Stripe Connect

        const { data: editorStripeData } = await supabase
            .from('editor_stripe_accounts')
            .select('stripe_account_id')
            .eq('editor_id', project.assigned_editor_id)
            .single();

        if (!editorStripeData?.stripe_account_id) {
            // Editor ainda não configurou conta
            // Criar payout pendente
            await supabase.from('pending_payouts').insert({
                project_id,
                editor_id: project.assigned_editor_id,
                amount: project.price,
                status: 'pending_setup',
            });

            // Notificar editor
            await supabase.from('notifications').insert({
                user_id: project.assigned_editor_id,
                type: 'setup_payout',
                title: 'Configure sua Conta para Receber',
                message: 'Configure sua conta Stripe para receber o pagamento do projeto aprovado.',
                reference_id: project_id,
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Pagamento pendente - aguardando configuração da conta do editor',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // 3. Capturar o Payment Intent (estava em hold)
        if (project.stripe_payment_intent_id) {
            try {
                await stripe.paymentIntents.capture(project.stripe_payment_intent_id);
            } catch (e) {
                console.error('Error capturing payment intent:', e);
                // Pode já ter sido capturado ou erro de API, mas continuamos para tentar transferir
            }
        }

        // 4. Criar transferência para conta Connect do editor
        const transfer = await stripe.transfers.create({
            amount: Math.round(project.price * 100), // em centavos
            currency: 'brl',
            destination: editorStripeData.stripe_account_id,
            description: `Pagamento - Projeto #${project_id}`,
            metadata: {
                project_id,
                editor_id: project.assigned_editor_id,
            },
        });

        // 5. Registrar transação
        await supabase.from('transactions').insert({
            project_id,
            user_id: project.assigned_editor_id,
            type: 'transfer',
            amount: project.price,
            stripe_transfer_id: transfer.id,
            status: 'completed',
        });

        // 6. Atualizar projeto
        await supabase
            .from('projects')
            .update({
                payment_released_at: new Date().toISOString(),
                stripe_transfer_id: transfer.id,
            })
            .eq('id', project_id);

        return new Response(
            JSON.stringify({
                success: true,
                transfer_id: transfer.id,
                amount: project.price,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    } catch (error: any) {
        console.error('Error releasing payment:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
