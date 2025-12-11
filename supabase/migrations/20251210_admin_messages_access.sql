-- Enable RLS (idempotent)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

-- Create policy for admins to view all messages
CREATE POLICY "Admins can view all messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND (
       role = 'super_admin' 
       OR 'view_all_messages' = ANY(permissions)
    )
  )
);
