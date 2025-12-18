-- Add 'archived' to project_status enum
ALTER TYPE public.project_status_enum ADD VALUE IF NOT EXISTS 'archived';
