-- Fix the view to use SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.product_rating_stats;

CREATE VIEW public.product_rating_stats WITH (security_invoker = true) AS
SELECT 
  product_id,
  COUNT(*)::INTEGER AS rating_count,
  ROUND(AVG(rating)::NUMERIC, 1) AS average_rating
FROM public.product_ratings
GROUP BY product_id;

-- Fix the function to have proper search_path
DROP FUNCTION IF EXISTS public.get_product_rating(UUID);

CREATE OR REPLACE FUNCTION public.get_product_rating(product_uuid UUID)
RETURNS TABLE(average_rating NUMERIC, rating_count INTEGER)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS average_rating,
    COUNT(*)::INTEGER AS rating_count
  FROM public.product_ratings
  WHERE product_id = product_uuid;
$$;