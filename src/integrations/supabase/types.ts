export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            admin_action_logs: {
                Row: {
                    action_details: Json | null
                    action_type: string
                    admin_id: string
                    created_at: string | null
                    id: string
                    ip_address: unknown
                    reason: string | null
                    target_id: string
                    target_type: string
                    user_agent: string | null
                }
                Insert: {
                    action_details?: Json | null
                    action_type: string
                    admin_id: string
                    created_at?: string | null
                    id?: string
                    ip_address?: unknown
                    reason?: string | null
                    target_id: string
                    target_type: string
                    user_agent?: string | null
                }
                Update: {
                    action_details?: Json | null
                    action_type?: string
                    admin_id?: string
                    created_at?: string | null
                    id?: string
                    ip_address?: unknown
                    reason?: string | null
                    target_id?: string
                    target_type?: string
                    user_agent?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "admin_action_logs_admin_id_fkey"
                        columns: ["admin_id"]
                        isOneToOne: false
                        referencedRelation: "admin_users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            admin_users: {
                Row: {
                    created_at: string | null
                    created_by: string | null
                    department: string | null
                    id: string
                    is_active: boolean | null
                    notes: string | null
                    permissions: Database["public"]["Enums"]["permission_enum"][] | null
                    role: Database["public"]["Enums"]["admin_role_enum"] | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    created_by?: string | null
                    department?: string | null
                    id?: string
                    is_active?: boolean | null
                    notes?: string | null
                    permissions?: Database["public"]["Enums"]["permission_enum"][] | null
                    role?: Database["public"]["Enums"]["admin_role_enum"] | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    created_by?: string | null
                    department?: string | null
                    id?: string
                    is_active?: boolean | null
                    notes?: string | null
                    permissions?: Database["public"]["Enums"]["permission_enum"][] | null
                    role?: Database["public"]["Enums"]["admin_role_enum"] | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "admin_users_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "admin_users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "admin_users_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            applications: {
                Row: {
                    cover_letter: string | null
                    created_at: string | null
                    delivery_time_days: number
                    editor_id: string
                    id: string
                    price_quote: number
                    project_id: string
                    status: Database["public"]["Enums"]["application_status_enum"] | null
                    updated_at: string | null
                }
                Insert: {
                    cover_letter?: string | null
                    created_at?: string | null
                    delivery_time_days: number
                    editor_id: string
                    id?: string
                    price_quote: number
                    project_id: string
                    status?: Database["public"]["Enums"]["application_status_enum"] | null
                    updated_at?: string | null
                }
                Update: {
                    cover_letter?: string | null
                    created_at?: string | null
                    delivery_time_days?: number
                    editor_id?: string
                    id?: string
                    price_quote?: number
                    project_id?: string
                    status?: Database["public"]["Enums"]["application_status_enum"] | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "applications_editor_id_fkey"
                        columns: ["editor_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "applications_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deliverables: {
                Row: {
                    created_at: string | null
                    description: string | null
                    download_url: string
                    file_path: string
                    file_size: number | null
                    file_type: string | null
                    id: string
                    project_id: string
                    status: Database["public"]["Enums"]["delivery_status_enum"] | null
                    thumbnail_url: string | null
                    title: string
                    updated_at: string | null
                    version: number | null
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    download_url: string
                    file_path: string
                    file_size?: number | null
                    file_type?: string | null
                    id?: string
                    project_id: string
                    status?: Database["public"]["Enums"]["delivery_status_enum"] | null
                    thumbnail_url?: string | null
                    title: string
                    updated_at?: string | null
                    version?: number | null
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    download_url?: string
                    file_path?: string
                    file_size?: number | null
                    file_type?: string | null
                    id?: string
                    project_id?: string
                    status?: Database["public"]["Enums"]["delivery_status_enum"] | null
                    thumbnail_url?: string | null
                    title?: string
                    updated_at?: string | null
                    version?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "deliverables_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                ]
            }
            editor_profiles: {
                Row: {
                    availability_status: string | null
                    bio: string | null
                    completed_projects_count: number | null
                    created_at: string | null
                    hourly_rate: number | null
                    id: string
                    languages: string[] | null
                    portfolio_url: string | null
                    rating: number | null
                    skills: string[] | null
                    software_proficiency: string[] | null
                    updated_at: string | null
                    years_of_experience: number | null
                }
                Insert: {
                    availability_status?: string | null
                    bio?: string | null
                    completed_projects_count?: number | null
                    created_at?: string | null
                    hourly_rate?: number | null
                    id: string
                    languages?: string[] | null
                    portfolio_url?: string | null
                    rating?: number | null
                    skills?: string[] | null
                    software_proficiency?: string[] | null
                    updated_at?: string | null
                    years_of_experience?: number | null
                }
                Update: {
                    availability_status?: string | null
                    bio?: string | null
                    completed_projects_count?: number | null
                    created_at?: string | null
                    hourly_rate?: number | null
                    id?: string
                    languages?: string[] | null
                    portfolio_url?: string | null
                    rating?: number | null
                    skills?: string[] | null
                    software_proficiency?: string[] | null
                    updated_at?: string | null
                    years_of_experience?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "editor_profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            financial_daily_summary: {
                Row: {
                    active_subscriptions: number | null
                    date: string
                    id: string
                    new_subscriptions: number | null
                    total_payouts: number | null
                    total_revenue: number | null
                    updated_at: string | null
                }
                Insert: {
                    active_subscriptions?: number | null
                    date: string
                    id?: string
                    new_subscriptions?: number | null
                    total_payouts?: number | null
                    total_revenue?: number | null
                    updated_at?: string | null
                }
                Update: {
                    active_subscriptions?: number | null
                    date?: string
                    id?: string
                    new_subscriptions?: number | null
                    total_payouts?: number | null
                    total_revenue?: number | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            notifications: {
                Row: {
                    created_at: string | null
                    id: string
                    is_read: boolean | null
                    message: string
                    title: string
                    type: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_read?: boolean | null
                    message: string
                    title: string
                    type: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_read?: boolean | null
                    message?: string
                    title?: string
                    type?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "notifications_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            projects: {
                Row: {
                    budget: number
                    created_at: string | null
                    creator_id: string
                    deadline: string
                    description: string
                    id: string
                    requirements: string[] | null
                    status: Database["public"]["Enums"]["project_status_enum"] | null
                    title: string
                    updated_at: string | null
                    video_type: string | null
                    revision_count: number | null
                }
                Insert: {
                    budget: number
                    created_at?: string | null
                    creator_id: string
                    deadline: string
                    description: string
                    id?: string
                    requirements?: string[] | null
                    status?: Database["public"]["Enums"]["project_status_enum"] | null
                    title: string
                    updated_at?: string | null
                    video_type?: string | null
                    revision_count?: number | null
                }
                Update: {
                    budget?: number
                    created_at?: string | null
                    creator_id?: string
                    deadline?: string
                    description?: string
                    id?: string
                    requirements?: string[] | null
                    status?: Database["public"]["Enums"]["project_status_enum"] | null
                    title?: string
                    updated_at?: string | null
                    video_type?: string | null
                    revision_count?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "projects_creator_id_fkey"
                        columns: ["creator_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            reviews: {
                Row: {
                    id: string
                    project_id: string
                    reviewer_id: string
                    reviewee_id: string
                    rating_communication: number
                    rating_quality: number
                    rating_deadline: number
                    rating_professionalism: number
                    rating_overall: number
                    comment: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    reviewer_id: string
                    reviewee_id: string
                    rating_communication: number
                    rating_quality: number
                    rating_deadline: number
                    rating_professionalism: number
                    rating_overall: number
                    comment?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    reviewer_id?: string
                    reviewee_id?: string
                    rating_communication?: number
                    rating_quality?: number
                    rating_deadline?: number
                    rating_professionalism?: number
                    rating_overall?: number
                    comment?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "reviews_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "reviews_reviewer_id_fkey"
                        columns: ["reviewer_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "reviews_reviewee_id_fkey"
                        columns: ["reviewee_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            transactions: {
                Row: {
                    amount: number
                    created_at: string | null
                    currency: string | null
                    description: string | null
                    id: string
                    metadata: Json | null
                    payment_method: string | null
                    reference_id: string | null
                    status: Database["public"]["Enums"]["transaction_status"] | null
                    type: Database["public"]["Enums"]["transaction_type"]
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    amount: number
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    id?: string
                    metadata?: Json | null
                    payment_method?: string | null
                    reference_id?: string | null
                    status?: Database["public"]["Enums"]["transaction_status"] | null
                    type: Database["public"]["Enums"]["transaction_type"]
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    amount?: number
                    created_at?: string | null
                    currency?: string | null
                    description?: string | null
                    id?: string
                    metadata?: Json | null
                    payment_method?: string | null
                    reference_id?: string | null
                    status?: Database["public"]["Enums"]["transaction_status"] | null
                    type?: Database["public"]["Enums"]["transaction_type"]
                    updated_at?: string | null
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "transactions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                ]
            }
            users: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    email: string
                    full_name: string | null
                    id: string
                    updated_at: string | null
                    user_type: Database["public"]["Enums"]["user_type_enum"]
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email: string
                    full_name?: string | null
                    id: string
                    updated_at?: string | null
                    user_type: Database["public"]["Enums"]["user_type_enum"]
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string
                    full_name?: string | null
                    id?: string
                    updated_at?: string | null
                    user_type?: Database["public"]["Enums"]["user_type_enum"]
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            apply_admin_profile: {
                Args: {
                    target_user_id: string
                    profile_name: string
                }
                Returns: undefined
            }
            check_is_admin: {
                Args: {
                    user_id: string
                }
                Returns: boolean
            }
            get_admin_dashboard_stats: {
                Args: Record<PropertyKey, never>
                Returns: {
                    total_users: number
                    active_projects: number
                    pending_approvals: number
                    monthly_revenue: number
                    growth_rate: number
                }[]
            }
            get_financial_metrics: {
                Args: {
                    start_date: string
                    end_date: string
                }
                Returns: {
                    total_revenue: number
                    total_payouts: number
                    net_income: number
                    active_subscriptions: number
                    mrr: number
                }[]
            }
            get_unread_notifications_count: {
                Args: {
                    p_user_id: string
                }
                Returns: number
            }
            handle_new_user: {
                Args: Record<PropertyKey, never>
                Returns: unknown
            }
        }
        Enums: {
            admin_role_enum: "super_admin" | "admin" | "financial" | "support"
            app_role: "admin" | "moderator" | "user"
            application_status_enum: "pending" | "accepted" | "rejected"
            delivery_status_enum:
            | "pending_review"
            | "approved"
            | "revision_requested"
            payment_status_enum:
            | "pending"
            | "paid"
            | "held"
            | "released"
            | "refunded"
            permission_enum:
            | "view_users"
            | "ban_users"
            | "unban_users"
            | "approve_editors"
            | "reject_editors"
            | "manage_admin_users"
            | "view_all_projects"
            | "modify_project_prices"
            | "apply_discounts"
            | "cancel_projects"
            | "force_complete_projects"
            | "view_disputes"
            | "resolve_disputes"
            | "issue_refunds"
            | "view_financial_data"
            | "modify_pricing_table"
            | "generate_financial_reports"
            | "process_manual_payments"
            | "view_all_messages"
            | "send_platform_messages"
            | "moderate_messages"
            | "view_analytics"
            | "export_data"
            project_status_enum:
            | "draft"
            | "open"
            | "in_progress"
            | "in_review"
            | "revision_requested"
            | "pending_approval"
            | "completed"
            | "cancelled"
            subscription_status_enum:
            | "active"
            | "past_due"
            | "cancelled"
            | "expired"
            transaction_status:
            | "pending"
            | "processing"
            | "completed"
            | "failed"
            | "refunded"
            | "cancelled"
            transaction_type:
            | "project_payment"
            | "editor_payout"
            | "subscription_payment"
            | "refund"
            | "platform_fee"
            | "adjustment"
            transaction_type_enum: "payment" | "transfer" | "refund"
            user_type_enum: "creator" | "editor" | "admin"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof Database
    }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
