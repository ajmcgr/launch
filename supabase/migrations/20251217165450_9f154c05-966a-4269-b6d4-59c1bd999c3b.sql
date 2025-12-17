-- Fix security definer warning by setting security_invoker = true
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Also fix the existing product_vote_counts view
ALTER VIEW public.product_vote_counts SET (security_invoker = true);