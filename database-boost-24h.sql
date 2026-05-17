-- ============================================================
-- Enforce exact 24h boost windows
-- ============================================================
-- Problem: boost rows used DATE columns (start_date / end_date),
-- so a boost was active for the whole calendar day of start_date
-- AND the whole calendar day of end_date — anywhere from ~24h
-- to ~48h depending on purchase time.
--
-- Fix: add a TIMESTAMPTZ `boost_ends_at` and filter on it.
-- Existing date columns are kept for backward compatibility.
-- ============================================================

-- 1. New precise expiry column
ALTER TABLE public.sponsored_products
  ADD COLUMN IF NOT EXISTS boost_ends_at TIMESTAMPTZ;

-- 2. Backfill any currently "active" boost rows so they end
--    24h after the start of their start_date (best-effort —
--    most active boosts will then expire within the next day).
UPDATE public.sponsored_products
SET boost_ends_at = (start_date::timestamptz + INTERVAL '24 hours')
WHERE sponsorship_type = 'boost'
  AND boost_ends_at IS NULL;

-- 3. Index for the hot path filter
CREATE INDEX IF NOT EXISTS sponsored_products_boost_active_idx
  ON public.sponsored_products (sponsorship_type, boost_ends_at)
  WHERE sponsorship_type = 'boost';

-- 4. Force-expire the "Bio" boost right now (was inserted manually
--    by database-activate-bio-boost.sql and outlived its 24h window).
UPDATE public.sponsored_products sp
SET boost_ends_at = now() - INTERVAL '1 second',
    end_date = CURRENT_DATE - INTERVAL '1 day'
FROM public.products p
WHERE sp.product_id = p.id
  AND sp.sponsorship_type = 'boost'
  AND p.slug = 'bio';
