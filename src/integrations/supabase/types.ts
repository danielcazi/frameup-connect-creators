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
      editor_profiles: {
        Row: {
          bio: string | null
          city: string | null
          created_at: string | null
          id: string
          rating_average: number | null
          software_skills: string[] | null
          specialties: string[] | null
          state: string | null
          total_projects: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          rating_average?: number | null
          software_skills?: string[] | null
          specialties?: string[] | null
          state?: string | null
          total_projects?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          rating_average?: number | null
          software_skills?: string[] | null
          specialties?: string[] | null
          state?: string | null
          total_projects?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          editor_id: string
          id: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          editor_id: string
          id?: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          editor_id?: string
          id?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_subscriptions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          project_id: string
          status: string
          stripe_payment_intent_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id: string
          status: string
          stripe_payment_intent_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string
          status?: string
          stripe_payment_intent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_videos: {
        Row: {
          created_at: string | null
          editor_id: string
          id: string
          order_position: number
          title: string | null
          video_type: string
          video_url: string
        }
        Insert: {
          created_at?: string | null
          editor_id: string
          id?: string
          order_position: number
          title?: string | null
          video_type: string
          video_url: string
        }
        Update: {
          created_at?: string | null
          editor_id?: string
          id?: string
          order_position?: number
          title?: string | null
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_videos_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_table: {
        Row: {
          base_price: number
          created_at: string | null
          duration_category: string
          editing_style: string
          estimated_delivery_days: number
          features: Json | null
          id: string
          platform_fee_percentage: number
          video_type: string
        }
        Insert: {
          base_price: number
          created_at?: string | null
          duration_category: string
          editing_style: string
          estimated_delivery_days: number
          features?: Json | null
          id?: string
          platform_fee_percentage?: number
          video_type: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          duration_category?: string
          editing_style?: string
          estimated_delivery_days?: number
          features?: Json | null
          id?: string
          platform_fee_percentage?: number
          video_type?: string
        }
        Relationships: []
      }
      project_applications: {
        Row: {
          created_at: string | null
          editor_id: string
          id: string
          message: string
          project_id: string
          status: Database["public"]["Enums"]["application_status_enum"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          editor_id: string
          id?: string
          message: string
          project_id: string
          status?: Database["public"]["Enums"]["application_status_enum"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          editor_id?: string
          id?: string
          message?: string
          project_id?: string
          status?: Database["public"]["Enums"]["application_status_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          assigned_editor_id: string | null
          base_price: number
          created_at: string | null
          creator_id: string
          deadline_days: number
          description: string
          duration: string
          editing_style: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          platform_fee: number
          reference_files_url: string | null
          status: Database["public"]["Enums"]["project_status_enum"]
          stripe_payment_intent_id: string | null
          title: string
          total_price: number
          updated_at: string | null
          video_type: string
        }
        Insert: {
          assigned_editor_id?: string | null
          base_price: number
          created_at?: string | null
          creator_id: string
          deadline_days: number
          description: string
          duration: string
          editing_style: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          platform_fee: number
          reference_files_url?: string | null
          status?: Database["public"]["Enums"]["project_status_enum"]
          stripe_payment_intent_id?: string | null
          title: string
          total_price: number
          updated_at?: string | null
          video_type: string
        }
        Update: {
          assigned_editor_id?: string | null
          base_price?: number
          created_at?: string | null
          creator_id?: string
          deadline_days?: number
          description?: string
          duration?: string
          editing_style?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          platform_fee?: number
          reference_files_url?: string | null
          status?: Database["public"]["Enums"]["project_status_enum"]
          stripe_payment_intent_id?: string | null
          title?: string
          total_price?: number
          updated_at?: string | null
          video_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_assigned_editor_id_fkey"
            columns: ["assigned_editor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          display_name: string
          has_highlight_badge: boolean | null
          id: string
          max_simultaneous_projects: number
          name: string
          price_monthly: number
          stripe_price_id: string
        }
        Insert: {
          created_at?: string | null
          display_name: string
          has_highlight_badge?: boolean | null
          id?: string
          max_simultaneous_projects: number
          name: string
          price_monthly: number
          stripe_price_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string
          has_highlight_badge?: boolean | null
          id?: string
          max_simultaneous_projects?: number
          name?: string
          price_monthly?: number
          stripe_price_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          profile_photo_url: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"]
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_type: Database["public"]["Enums"]["user_type_enum"]
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type_enum"]
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      validate_and_create_application: {
        Args: { p_editor_id: string; p_message: string; p_project_id: string }
        Returns: {
          application_id: string
          error_code: string
          error_message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      application_status_enum: "pending" | "accepted" | "rejected"
      payment_status_enum: "pending" | "paid" | "held" | "released" | "refunded"
      project_status_enum:
        | "draft"
        | "open"
        | "in_progress"
        | "in_review"
        | "completed"
        | "cancelled"
      subscription_status_enum: "active" | "past_due" | "cancelled" | "expired"
      user_type_enum: "creator" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status_enum: ["pending", "accepted", "rejected"],
      payment_status_enum: ["pending", "paid", "held", "released", "refunded"],
      project_status_enum: [
        "draft",
        "open",
        "in_progress",
        "in_review",
        "completed",
        "cancelled",
      ],
      subscription_status_enum: ["active", "past_due", "cancelled", "expired"],
      user_type_enum: ["creator", "editor"],
    },
  },
} as const
