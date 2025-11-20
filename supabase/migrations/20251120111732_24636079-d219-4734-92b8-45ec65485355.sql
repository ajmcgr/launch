-- Add stripe_customer_id to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;