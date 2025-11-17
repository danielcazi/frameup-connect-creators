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

export interface User {
  id: string;
  email: string;
  user_type: UserType;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  payment_status: PaymentStatus;
  base_price: number;
  platform_fee: number;
  total_price: number;
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
