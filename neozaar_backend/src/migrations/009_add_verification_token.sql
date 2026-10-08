-- Add verification_token column to users table (required for email verification flow)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) NULL;

-- Add lead_source column if missing
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS lead_source VARCHAR(255) NULL;
