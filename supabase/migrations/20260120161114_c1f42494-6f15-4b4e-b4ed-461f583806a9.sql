-- Add RLS policy to allow public read access to user profiles
-- This enables anonymous users to see maker info on product pages
CREATE POLICY "Public profiles are viewable by everyone"
ON public.users
FOR SELECT
USING (true);