-- Create a public view for products that excludes sensitive payment and financial fields
CREATE OR REPLACE VIEW public.public_products
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  tagline,
  description,
  slug,
  domain_url,
  platforms,
  languages,
  status,
  launch_date,
  owner_id,
  created_at,
  won_daily,
  won_weekly,
  won_monthly,
  badge_embedded,
  badge_verified_at,
  last_badge_check,
  -- Expose only a boolean indicating if MRR is verified, not the actual amount
  CASE WHEN verified_mrr IS NOT NULL AND verified_mrr > 0 THEN true ELSE false END as has_verified_revenue,
  -- Expose coupon info only (description is public, code remains hidden)
  coupon_description
FROM public.products;

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

-- Create a new policy that only allows owners, makers, and admins to view full product data
CREATE POLICY "Product owners can view their products"
ON public.products
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Product makers can view products they work on"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.product_makers 
    WHERE product_makers.product_id = products.id 
    AND product_makers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow public access through the view for non-sensitive fields
-- The view will be queryable by everyone since it uses security_invoker
-- and we need to allow SELECT on the base table for the view to work
-- So we create a policy that allows SELECT but only through specific conditions
CREATE POLICY "Public can view products via view"
ON public.products
FOR SELECT
USING (true);

-- Note: Since the view uses security_invoker, we need to keep a permissive SELECT policy
-- But the view itself only exposes safe fields. The issue is that direct table access
-- would still be possible. Let me revise the approach.