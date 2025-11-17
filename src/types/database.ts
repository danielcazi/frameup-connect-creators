export type UserType = 'creator' | 'editor';

export type ProjectStatus = 
  | 'draft' 
  | 'open' 
  | 'in_progress' 
  | 'in_review' 
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
