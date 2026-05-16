-- ============================================================
-- One-off recovery: activate the Featured Boost for "Bio"
-- ============================================================
-- The Stripe webhook did not insert the boost row (most likely
-- because supabase/functions/stripe-webhook was not redeployed
-- after the recent custom-ads changes). This restores the boost
-- the user already paid for.
-- ============================================================

INSERT INTO public.sponsored_products (
  product_id,
  position,
  sponsorship_type,
  ad_type,
  start_date,
  end_date
)
SELECT
  p.id,
  0,
  'boost',
  'product',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '1 day'
FROM public.products p
WHERE p.slug = 'bio'
  AND NOT EXISTS (
    SELECT 1 FROM public.sponsored_products sp
    WHERE sp.product_id = p.id
      AND sp.sponsorship_type = 'boost'
      AND sp.start_date <= CURRENT_DATE
      AND sp.end_date >= CURRENT_DATE
  );

-- Also log the order so it shows in admin/billing history
INSERT INTO public.orders (user_id, product_id, plan, stripe_session_id)
SELECT p.owner_id, p.id, 'boost', 'manual-recovery-bio-' || CURRENT_DATE
FROM public.products p
WHERE p.slug = 'bio'
  AND NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.product_id = p.id
      AND o.plan = 'boost'
      AND o.created_at::date = CURRENT_DATE
  );
