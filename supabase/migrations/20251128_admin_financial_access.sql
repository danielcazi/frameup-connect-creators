-- Allow admins to view all projects
CREATE POLICY "Admins can view all projects"
ON projects
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'view_all_projects'::permission_enum) OR
  has_permission(auth.uid(), 'view_financial_data'::permission_enum)
);

-- Allow admins to view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON editor_subscriptions
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'view_financial_data'::permission_enum) OR
  has_permission(auth.uid(), 'view_analytics'::permission_enum)
);

-- Allow admins to view subscription plans (if not already public)
-- Check if policy exists first or just add it if needed. Usually plans are public read.
-- But just in case:
CREATE POLICY "Admins can view all subscription plans"
ON subscription_plans
FOR SELECT
TO authenticated
USING (
  has_permission(auth.uid(), 'view_financial_data'::permission_enum) OR
  has_permission(auth.uid(), 'modify_pricing_table'::permission_enum)
);
