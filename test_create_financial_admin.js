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
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Starting test...');

    // 1. Sign in as Super Admin
    const superAdminEmail = 'superadmin_test_v2@frameup.com';
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: superAdminEmail,
        password: 'password123'
    });

    if (signInError) {
        console.log('Could not sign in, attempting to create super admin...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: superAdminEmail,
            password: 'password123',
            options: {
                data: {
                    full_name: 'Super Admin V2',
                    user_type: 'admin'
                }
            }
        });

        if (signUpError) {
            console.error('Error creating super admin:', signUpError);
            return;
        }
        console.log('Super admin created in Auth.');
        console.log('User ID:', signUpData.user?.id);
        console.log('PLEASE RUN BOOTSTRAP SQL FOR THIS ID AND RERUN SCRIPT.');
        return;
    }

    console.log('Signed in as Super Admin:', signInData.user.id);
    const superAdminId = signInData.user.id;

    // 2. Create Financial User (Target)
    const financeEmail = `finance_test_${Date.now()}@frameup.com`;
    console.log(`Creating target user: ${financeEmail}`);

    const { data: financeUser, error: financeError } = await supabase.auth.signUp({
        email: financeEmail,
        password: 'password123',
        options: {
            data: {
                full_name: 'Finance Test User',
                user_type: 'editor' // Normal user initially
            }
        }
    });

    if (financeError) {
        console.error('Error creating finance user:', financeError);
        return;
    }
    console.log('Target user created:', financeUser.user.id);

    // 3. Promote to Financial Admin
    console.log('Promoting to Financial Admin...');

    const financialPermissions = [
        'view_financial_data',
        'generate_financial_reports',
        'process_manual_payments',
        'issue_refunds',
        'modify_pricing_table',
        'apply_discounts',
        'view_analytics',
        'export_data'
    ];

    const { data: adminId, error: rpcError } = await supabase.rpc('create_admin_user', {
        p_user_id: financeUser.user.id,
        p_role: 'financial',
        p_permissions: financialPermissions,
        p_department: 'Finance Dept',
        p_notes: 'Created via test script',
        p_created_by: superAdminId
    });

    if (rpcError) {
        console.error('Error promoting user:', rpcError);
    } else {
        console.log('Success! Admin ID:', adminId);

        // Verify
        const { data: verifyData, error: verifyError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('id', adminId)
            .single();

        if (verifyError) {
            console.error('Error verifying admin:', verifyError);
        } else {
            console.log('Verified Admin User:', verifyData);
        }
    }
}

main();
