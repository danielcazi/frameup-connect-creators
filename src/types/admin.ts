// Enums
export type AdminRole = 'super_admin' | 'admin' | 'financial' | 'support' | 'gestor';

export type Permission =
    // Gestão de usuários
    | 'view_users'
    | 'ban_users'
    | 'unban_users'
    | 'approve_editors'
    | 'reject_editors'
    | 'manage_admin_users'
    // Gestão de projetos
    | 'view_all_projects'
    | 'modify_project_prices'
    | 'apply_discounts'
    | 'cancel_projects'
    | 'force_complete_projects'
    // Gestão de disputas
    | 'view_disputes'
    | 'resolve_disputes'
    | 'issue_refunds'
    // Gestão financeira
    | 'view_financial_data'
    | 'modify_pricing_table'
    | 'generate_financial_reports'
    | 'process_manual_payments'
    // Comunicação
    | 'view_all_messages'
    | 'send_platform_messages'
    | 'moderate_messages'
    // Analytics
    | 'view_analytics'
    | 'export_data';

// Interfaces
export interface AdminUser {
    id: string;
    user_id: string;
    full_name?: string; // Joined from users table
    role: AdminRole;
    permissions: Permission[];
    is_active: boolean;
    department: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface AdminActionLog {
    id: string;
    admin_id: string;
    action_type: string;
    target_type: string;
    target_id: string;
    action_details: Record<string, any>;
    reason: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

export interface UserMetadataExtension {
    user_id: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    approval_notes: string | null;
    approved_by: string | null;
    approved_at: string | null;
    is_banned: boolean;
    ban_reason: string | null;
    banned_by: string | null;
    banned_at: string | null;
    bias_score: number;
    total_warnings: number;
    updated_at: string;
}

// Role Hierarchy (para verificações)
export const ROLE_HIERARCHY: Record<AdminRole, number> = {
    'super_admin': 4,
    'admin': 3,
    'financial': 2,
    'support': 2,
    'gestor': 3,
};

// Permissions por Role (padrão)
export const DEFAULT_PERMISSIONS: Record<AdminRole, Permission[]> = {
    'super_admin': [
        'view_users', 'ban_users', 'unban_users', 'approve_editors', 'reject_editors', 'manage_admin_users',
        'view_all_projects', 'modify_project_prices', 'apply_discounts', 'cancel_projects', 'force_complete_projects',
        'view_disputes', 'resolve_disputes', 'issue_refunds',
        'view_financial_data', 'modify_pricing_table', 'generate_financial_reports', 'process_manual_payments',
        'view_all_messages', 'send_platform_messages', 'moderate_messages',
        'view_analytics', 'export_data'
    ],
    'admin': [
        'view_users', 'ban_users', 'unban_users', 'approve_editors', 'reject_editors',
        'view_all_projects', 'modify_project_prices', 'apply_discounts',
        'view_disputes', 'resolve_disputes', 'issue_refunds',
        'view_financial_data', 'modify_pricing_table',
        'view_all_messages', 'moderate_messages',
        'view_analytics'
    ],
    'financial': [
        'view_all_projects', 'modify_project_prices', 'apply_discounts',
        'view_financial_data', 'modify_pricing_table', 'generate_financial_reports',
        'view_analytics', 'export_data'
    ],
    'support': [
        'view_users', 'approve_editors', 'reject_editors',
        'view_disputes', 'resolve_disputes',
        'view_all_messages', 'send_platform_messages', 'moderate_messages'
    ],
    'gestor': [
        'view_users', 'ban_users', 'unban_users', 'approve_editors', 'reject_editors',
        'view_all_projects', 'modify_project_prices', 'apply_discounts',
        'view_analytics', 'export_data'
    ]
};

// Helper functions
export function hasPermission(admin: AdminUser, permission: Permission): boolean {
    return admin.permissions.includes(permission);
}

export function hasHigherRole(role1: AdminRole, role2: AdminRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

export function canManageAdmin(currentAdmin: AdminUser, targetAdmin: AdminUser): boolean {
    // Super admin pode gerenciar todos
    if (currentAdmin.role === 'super_admin') return true;

    // Outros roles não podem gerenciar admins
    return false;
}

// Editor Approval Types
export interface EditorApprovalQueue {
    id: string;
    editor_id: string;
    status: 'pending' | 'approved' | 'rejected';
    portfolio_quality_score: number | null;
    profile_completeness_score: number | null;
    reviewer_notes: string | null;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    submitted_at: string;
    has_duplicate_portfolio: boolean;
    has_suspicious_links: boolean;
    auto_flags: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface EditorApprovalDetails extends EditorApprovalQueue {
    editor: {
        id: string;
        name: string;
        email: string;
        bio: string;
        city: string;
        state: string;
        software_skills: string[];
        specialties: string[];
    };
    portfolio: {
        id: string;
        video_url: string;
        video_type: string;
        title: string;
        order_position: number;
    }[];
}

// Dispute Types
export type DisputeCategory =
    | 'delivery_delay'
    | 'quality_issue'
    | 'payment_issue'
    | 'communication_issue'
    | 'scope_change'
    | 'inappropriate_behavior'
    | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export type DisputeStatus = 'open' | 'investigating' | 'waiting_response' | 'resolved' | 'closed';

export type DisputeResolutionType =
    | 'refund_full'
    | 'refund_partial'
    | 'payment_released'
    | 'warning_issued'
    | 'user_banned'
    | 'no_action'
    | 'other';

export interface Dispute {
    id: string;
    project_id: string;
    opened_by: string;
    disputed_user_id: string;
    category: DisputeCategory;
    priority: DisputePriority;
    title: string;
    description: string;
    evidence_urls: string[];
    status: DisputeStatus;
    resolution: string | null;
    resolution_type: DisputeResolutionType | null;
    assigned_to: string | null;
    assigned_at: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface DisputeMessage {
    id: string;
    dispute_id: string;
    sender_id: string;
    message: string;
    is_internal: boolean;
    attachments: string[];
    created_at: string;
}

export interface DisputeWithDetails extends Dispute {
    project: {
        id: string;
        title: string;
        base_price: number;
        status: string;
    };
    opened_by_user: {
        id: string;
        email: string;
        type: 'creator' | 'editor';
    };
    disputed_user: {
        id: string;
        email: string;
        type: 'creator' | 'editor';
    };
    messages: DisputeMessage[];
}

// Financial Types
export interface DiscountCode {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    max_uses: number | null;
    current_uses: number;
    min_project_value: number | null;
    valid_from: string;
    valid_until: string | null;
    is_active: boolean;
    allowed_video_types: string[] | null;
    allowed_user_ids: string[] | null;
    first_purchase_only: boolean;
    description: string | null;
    internal_notes: string | null;
    created_by: string;
    created_at: string;
}

export interface DiscountUsage {
    id: string;
    discount_code_id: string;
    project_id: string;
    user_id: string;
    discount_applied: number;
    original_price: number;
    final_price: number;
    used_at: string;
}

export interface ProjectPriceOverride {
    id: string;
    project_id: string;
    original_price: number;
    new_price: number;
    reason: string;
    approved_by: string;
    applied_at: string;
}
