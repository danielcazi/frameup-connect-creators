import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.development manually
const envPath = path.resolve(process.cwd(), '.env.development');
const envConfig = fs.readFileSync(envPath, 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY']; // Try anon first, or service role if available
const serviceRoleKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

// Use service role key if available, otherwise anon
const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseKey);

async function main() {
    console.log('Starting subscription update...');
    console.log('Service Role Key present:', !!serviceRoleKey);

    // 0. Login as editorFULL
    console.log('Logging in as editorFULL@frameup.com...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'editorFULL@frameup.com',
        password: 'password123'
    });

    if (signInError) {
        console.error('FATAL: Login failed:', signInError.message);
        return;
    }
    console.log('Logged in as editorFULL.');
    const userId = signInData.user.id;
    console.log(`Found user ID: ${userId}`);

    // 1. Get Pro Plan ID
    const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'pro')
        .single();

    if (planError || !planData) {
        console.error('Could not find Pro plan:', planError?.message);
        return;
    }

    const planId = planData.id;
    console.log(`Found Pro plan with ID: ${planId}`);

    // 3. Upsert Subscription
    const subscriptionData = {
        editor_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
        cancel_at_period_end: false,
    };

    const { data: subData, error: subError } = await supabase
        .from('editor_subscriptions')
        .upsert(subscriptionData, { onConflict: 'editor_id' })
        .select();

    if (subError) {
        console.error('Error updating subscription:', subError.message);
    } else {
        console.log('Success! Subscription updated.');
    }
}

main();
