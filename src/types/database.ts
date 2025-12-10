export type UserType = 'creator' | 'editor';

export type ProjectStatus =
  | 'draft'
  | 'open'
  | 'in_progress'
  | 'in_review'
  | 'revision_requested'
  | 'pending_approval'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'held'
  | 'released'
  | 'refunded';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export type SubscriptionPlan = 'basic' | 'pro';

export type VideoType = 'reels' | 'motion' | 'youtube';
export type EditingStyle = 'lofi' | 'dynamic' | 'pro' | 'motion';
export type Duration = '30s' | '1m' | '2m' | '5m';

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  full_name: string;
  username: string;
  phone: string;
  profile_photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface EditorProfile {
  id: string;
  user_id: string;
  bio?: string;
  city?: string;
  state?: string;
  specialties: string[];
  software_skills: string[];
  rating_average: number;
  total_projects: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface PortfolioVideo {
  id: string;
  editor_id: string;
  video_url: string;
  video_type: 'simple' | 'dynamic' | 'motion';
  title?: string;
  order_position: 1 | 2 | 3;
  created_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  assigned_editor_id?: string;
  title: string;
  description: string;
  video_type: VideoType;
  editing_style: EditingStyle;
  duration_category: Duration;
  base_price: number;
  platform_fee: number;
  total_paid_by_creator: number;
  status: ProjectStatus;
  payment_status: PaymentStatus;
  max_applications: number;
  current_applications: number;
  current_revisions: number;
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface EditorSubscription {
  id: string;
  editor_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_subscription_id?: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

// Admin System Types
export type AdminRole = 'super_admin' | 'admin' | 'financial' | 'support';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AdminUser {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: string[];
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
  approval_status: ApprovalStatus;
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

// Reviews System Types
export interface Review {
  id: string;
  project_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating_communication: number;
  rating_quality: number;
  rating_deadline: number;
  rating_professionalism: number;
  rating_overall: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

// Review with relations for display purposes
export interface ReviewWithRelations extends Review {
  reviewer?: User;
  reviewee?: User;
  project?: Project;
}
