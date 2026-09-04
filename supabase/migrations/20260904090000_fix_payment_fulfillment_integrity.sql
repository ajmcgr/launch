-- Keep every checkout fulfillment retry-safe and allow the active Grow plan.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_plan_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_plan_check
  CHECK (plan = ANY (ARRAY[
    'free'::text,
    'join'::text,
    'skip'::text,
    'relaunch'::text,
    'boost'::text,
    'grow'::text
  ]));

-- Remove any historical exact duplicates before enforcing webhook idempotency.
DELETE FROM public.orders duplicate
USING public.orders canonical
WHERE duplicate.id > canonical.id
  AND duplicate.stripe_session_id = canonical.stripe_session_id
  AND duplicate.product_id IS NOT DISTINCT FROM canonical.product_id
  AND duplicate.plan = canonical.plan;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_product_plan_unique
  ON public.orders (stripe_session_id, product_id, plan);

-- Boost placement and its order ledger entry must either both commit or both fail.
CREATE OR REPLACE FUNCTION public.fulfill_boost_purchase(
  p_checkout_session_id text,
  p_user_id uuid,
  p_product_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_checkout_session_id IS NULL OR p_checkout_session_id = ''
     OR p_user_id IS NULL
     OR p_product_id IS NULL
     OR p_starts_at IS NULL
     OR p_ends_at IS NULL
     OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'INVALID_BOOST_FULFILLMENT';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('launch-boost:' || p_checkout_session_id, 0));

  IF NOT EXISTS (
    SELECT 1
    FROM public.sponsored_products
    WHERE checkout_session_id = p_checkout_session_id
      AND sponsorship_type = 'boost'
  ) THEN
    INSERT INTO public.sponsored_products (
      product_id,
      position,
      sponsorship_type,
      start_date,
      end_date,
      boost_ends_at,
      checkout_session_id,
      slot_month
    ) VALUES (
      p_product_id,
      0,
      'boost',
      p_starts_at::date,
      p_ends_at::date,
      p_ends_at,
      p_checkout_session_id,
      p_starts_at::date
    );
  END IF;

  INSERT INTO public.orders (user_id, product_id, stripe_session_id, plan)
  VALUES (p_user_id, p_product_id, p_checkout_session_id, 'boost')
  ON CONFLICT (stripe_session_id, product_id, plan) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_boost_purchase(text, uuid, uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_boost_purchase(text, uuid, uuid, timestamptz, timestamptz) TO service_role;
