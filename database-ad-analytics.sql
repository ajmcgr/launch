-- ============================================================
-- Basic ad analytics: impressions + clicks on sponsored_products
-- Additive only. Run in the Supabase SQL editor.
-- ============================================================

ALTER TABLE public.sponsored_products
  ADD COLUMN IF NOT EXISTS impressions bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks bigint NOT NULL DEFAULT 0;

-- Counter RPCs (security definer so visitors can increment without
-- any UPDATE grant on the table itself).
CREATE OR REPLACE FUNCTION public.increment_ad_impression(ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sponsored_products
  SET impressions = impressions + 1
  WHERE id = ad_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_click(ad_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.sponsored_products
  SET clicks = clicks + 1
  WHERE id = ad_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_ad_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_click(uuid) TO anon, authenticated;

-- Rollback (if ever needed):
-- DROP FUNCTION IF EXISTS public.increment_ad_impression(uuid);
-- DROP FUNCTION IF EXISTS public.increment_ad_click(uuid);
-- ALTER TABLE public.sponsored_products DROP COLUMN IF EXISTS impressions, DROP COLUMN IF EXISTS clicks;
