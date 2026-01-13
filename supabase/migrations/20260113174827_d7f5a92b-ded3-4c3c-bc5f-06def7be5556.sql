-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- Create a new policy that only allows users to view their own full profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Allow admins to view all user profiles for administrative purposes
CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));