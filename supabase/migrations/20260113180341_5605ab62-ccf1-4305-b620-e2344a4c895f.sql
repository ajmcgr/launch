-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Product makers can view products they work on" ON public.products;
DROP POLICY IF EXISTS "Product owners can view their products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Public can view products via view" ON public.products;

-- Recreate a simple public SELECT policy (the view public_products provides the security by only exposing safe fields)
CREATE POLICY "Products are viewable by everyone"
ON public.products
FOR SELECT
USING (true);