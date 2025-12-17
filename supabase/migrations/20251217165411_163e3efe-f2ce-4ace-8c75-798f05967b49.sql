-- Create a public_profiles view that excludes sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  name,
  avatar_url,
  bio,
  website,
  twitter,
  instagram,
  linkedin,
  youtube,
  telegram,
  created_at,
  updated_at
FROM public.users;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.public_profiles IS 'Public user profiles view that excludes sensitive data like stripe_customer_id and notification preferences';