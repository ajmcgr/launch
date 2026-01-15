-- Add annual access fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS plan text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS annual_access_expires_at timestamp with time zone DEFAULT NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);
CREATE INDEX IF NOT EXISTS idx_users_annual_access_expires ON public.users(annual_access_expires_at);