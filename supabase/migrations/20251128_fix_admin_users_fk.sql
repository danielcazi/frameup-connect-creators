-- Add foreign key from admin_users.user_id to public.users.id
ALTER TABLE admin_users
ADD CONSTRAINT admin_users_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Update full_name for the test user if it's null
UPDATE public.users
SET full_name = 'Test Super Admin'
WHERE id = '89448a9c-5422-4939-8552-a901878d1a6f' AND full_name IS NULL;
