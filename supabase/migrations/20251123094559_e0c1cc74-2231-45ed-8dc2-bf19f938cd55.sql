-- Add notification preferences to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_follow BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_comment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_vote BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_launch BOOLEAN DEFAULT true;