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

const ACCOUNTS = [
    {
        email: 'financeiro@frameup.com',
        password: 'FrameUpAdmin2025!',
        name: 'Admin Financeiro',
        role: 'financial',
        department: 'Financeiro'
    },
    {
        email: 'suporte@frameup.com',
        password: 'FrameUpAdmin2025!',
        name: 'Admin Suporte',
        role: 'support',
        department: 'Suporte'
    },
    {
        email: 'gestor@frameup.com',
        password: 'FrameUpAdmin2025!',
        name: 'Admin Gestor',
        role: 'gestor',
        department: 'Gestão'
    }
];

async function main() {
    console.log('Starting admin creation process...');

    // 1. Sign in as Super Admin
    const superAdminEmail = 'superadmin_test_v2@frameup.com';
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: superAdminEmail,
        password: 'password123'
    });

    if (signInError) {
        console.error('FATAL: Could not sign in as Super Admin:', signInError.message);
        return;
    }
    const superAdminId = signInData.user.id;
    console.log('Logged in as Super Admin.');

    // 2. Fetch Role Templates
    const { data: templates, error: templatesError } = await supabase
        .from('admin_role_templates')
        .select('*');

    if (templatesError) {
        console.error('FATAL: Could not fetch role templates:', templatesError.message);
        return;
    }

    // 3. Process each account
    for (const acc of ACCOUNTS) {
        console.log(`\nProcessing ${acc.role} (${acc.email})...`);

        // Find permissions from template
        const template = templates.find(t => t.role_name === acc.role);
        if (!template) {
            console.error(`  Error: No template found for role ${acc.role}`);
            continue;
        }

        // Create User in Auth
        let userId;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: acc.email,
            password: acc.password,
            options: {
                data: {
                    full_name: acc.name,
                    user_type: 'admin'
                }
            }
        });

        if (signUpError) {
            console.log(`  User might already exist or error: ${signUpError.message}`);

            // Try to find in eligible users (profiles)
            const { data: eligible } = await supabase.rpc('get_eligible_admin_users', { p_search: acc.email });
            const found = eligible?.find(u => u.email === acc.email);

            if (found) {
                userId = found.user_id;
                console.log(`  Found existing eligible user: ${userId}`);
            } else {
                console.log(`  Could not find user ID (maybe already admin?). Skipping promotion.`);
                continue;
            }
        } else if (signUpData.user) {
            userId = signUpData.user.id;
            console.log(`  User created: ${userId}`);
        }

        if (!userId) {
            console.error('  Skipping: No User ID found.');
            continue;
        }

        // Promote to Admin
        const { data: adminId, error: rpcError } = await supabase.rpc('create_admin_user', {
            p_user_id: userId,
            p_role: acc.role,
            p_permissions: template.permissions,
            p_department: acc.department,
            p_notes: 'Created via setup script',
            p_created_by: superAdminId
        });

        if (rpcError) {
            console.error(`  Error promoting user: ${rpcError.message}`);
        } else {
            console.log(`  Success! Admin created with ID: ${adminId}`);
        }
    }
}

main();
