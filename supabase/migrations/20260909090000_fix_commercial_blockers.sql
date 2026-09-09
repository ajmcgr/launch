-- Remove the exact synthetic outcome values previously inserted by
-- database-seed-outcomes.sql while preserving maker-submitted outcomes.
WITH seeded_outcomes(signups, revenue) AS (
  VALUES
    (847, 2400::numeric), (312, 0), (1240, 8900), (56, 350), (189, 1200),
    (425, 0), (73, 4500), (2100, 15000), (94, 0), (530, 3200),
    (1580, 7200), (210, 980), (45, 0), (890, 5400), (367, 1800),
    (1920, 12500), (78, 0), (640, 3600), (155, 750), (3200, 28000),
    (410, 2100), (92, 0), (1100, 6800), (275, 1500), (58, 420),
    (730, 0), (1450, 9200), (185, 600), (520, 2800), (67, 0),
    (2800, 18500), (340, 1400), (125, 0), (960, 4100), (480, 2200)
)
DELETE FROM public.product_outcomes outcome
USING seeded_outcomes seeded
WHERE outcome.signups = seeded.signups
  AND outcome.revenue = seeded.revenue;

-- Paid fulfillment is exclusively available to trusted server code.
REVOKE EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_boost_purchase(text, uuid, uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fulfill_website_sponsorship(
  text, uuid, text, text, date[], date[], text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_boost_purchase(text, uuid, uuid, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_website_sponsorship(
  text, uuid, text, text, date[], date[], text, text, text, text
) TO service_role;

-- Clients may record only free launches for products they own. Stripe webhooks
-- continue to insert paid orders through the service role, which bypasses RLS.
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own free orders" ON public.orders;

CREATE POLICY "Users can create own free orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND EXISTS (
    SELECT 1
    FROM public.products product
    WHERE product.id = orders.product_id
      AND product.owner_id = auth.uid()
  )
);

-- Pass launches need a paid ledger entry, but the client cannot be trusted to
-- assert entitlement. This function derives the user from the JWT and validates
-- both the active annual Pass and product ownership.
CREATE OR REPLACE FUNCTION public.create_pass_launch_order(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  order_id uuid;
  pass_reference text;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = caller_id
      AND plan = 'annual_access'
      AND annual_access_expires_at > now()
  ) THEN
    RAISE EXCEPTION 'ACTIVE_PASS_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = p_product_id
      AND owner_id = caller_id
  ) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND_OR_ACCESS_DENIED';
  END IF;

  pass_reference := 'annual_access_' || caller_id::text || '_' || p_product_id::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(pass_reference, 0));

  SELECT id INTO order_id
  FROM public.orders
  WHERE stripe_session_id = pass_reference
    AND product_id = p_product_id
    AND plan = 'skip'
  LIMIT 1;

  IF order_id IS NULL THEN
    INSERT INTO public.orders (user_id, product_id, stripe_session_id, plan)
    VALUES (caller_id, p_product_id, pass_reference, 'skip')
    RETURNING id INTO order_id;
  END IF;

  RETURN order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_pass_launch_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pass_launch_order(uuid) TO authenticated, service_role;
