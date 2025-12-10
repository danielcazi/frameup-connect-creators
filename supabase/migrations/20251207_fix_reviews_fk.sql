-- Add missing foreign keys to reviews table to allow joining with users
-- This fixes the PGRST200 error in ReviewsList.tsx

DO $$
BEGIN
    -- Add reviewer_id FK if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewer_id_fkey') THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_reviewer_id_fkey 
        FOREIGN KEY (reviewer_id) 
        REFERENCES public.users(id)
        ON DELETE CASCADE;
    END IF;

    -- Add reviewee_id FK if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewee_id_fkey') THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT reviews_reviewee_id_fkey 
        FOREIGN KEY (reviewee_id) 
        REFERENCES public.users(id)
        ON DELETE CASCADE;
    END IF;
END
$$;
