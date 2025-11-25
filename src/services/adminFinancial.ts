import { supabase } from '@/lib/supabase';
import { DiscountCode } from '@/types/admin';

// Dashboard Overview
export async function getFinancialDashboard(startDate?: string, endDate?: string) {
    try {
        // Buscar métricas
        const { data: projects } = await supabase
            .from('projects')
            .select('base_price, payment_status, created_at')
            .gte('created_at', startDate || '2024-01-01')
            .lte('created_at', endDate || new Date().toISOString());

        const { data: subscriptions } = await supabase
            .from('editor_subscriptions')
            .select('plan_id, current_period_start, current_period_end')
            .eq('status', 'active');

        // Calcular métricas
        const totalRevenue = projects?.reduce((sum, p) => sum + (p.base_price || 0), 0) || 0;
        const platformFees = totalRevenue * 0.05;

        return {
            totalRevenue,
            platformFees,
            subscriptionRevenue: (subscriptions?.length || 0) * 39.99, // simplificado
            totalProjects: projects?.length || 0,
            // ... mais métricas
        };
    } catch (error) {
        console.error('Erro ao buscar dashboard financeiro:', error);
        throw error;
    }
}

// Cupons
export async function createDiscountCode(data: Partial<DiscountCode>) {
    try {
        const { error } = await supabase.from('discount_codes').insert(data);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        throw error;
    }
}

export async function getDiscountCodes() {
    try {
        const { data, error } = await supabase
            .from('discount_codes')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as DiscountCode[];
    } catch (error) {
        throw error;
    }
}

export async function deactivateDiscountCode(codeId: string) {
    try {
        const { error } = await supabase
            .from('discount_codes')
            .update({ is_active: false })
            .eq('id', codeId);
        if (error) throw error;
        return { success: true };
    } catch (error) {
        throw error;
    }
}

// Relatórios
export async function exportFinancialReport(startDate: string, endDate: string) {
    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select(`
        id,
        title,
        base_price,
        payment_status,
        created_at,
        creator:creator_id(email),
        editor:assigned_editor_id(email)
      `)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

        if (error) throw error;

        // Convert to CSV
        const headers = ['ID', 'Title', 'Price', 'Status', 'Date', 'Creator', 'Editor'];
        const csvContent = [
            headers.join(','),
            ...(projects || []).map(p => [
                p.id,
                `"${p.title.replace(/"/g, '""')}"`,
                p.base_price,
                p.payment_status,
                p.created_at,
                (p.creator as any)?.email || '',
                (p.editor as any)?.email || ''
            ].join(','))
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financial_report_${startDate}_${endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true };
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        throw error;
    }
}
