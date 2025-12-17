-- Fix search_path for get_comment_count function
CREATE OR REPLACE FUNCTION public.get_comment_count(product_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.comments
  WHERE product_id = product_uuid;
$$;