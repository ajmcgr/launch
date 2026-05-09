-- Allow $19 Boost purchases to be recorded by the Stripe webhook.
ALTER TABLE public.sponsored_products
DROP CONSTRAINT IF EXISTS sponsored_products_sponsorship_type_check;

ALTER TABLE public.sponsored_products
ADD CONSTRAINT sponsored_products_sponsorship_type_check
CHECK (sponsorship_type IN ('website', 'newsletter', 'combined', 'boost'));

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_plan_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_plan_check
CHECK (plan = ANY (ARRAY['free'::text, 'join'::text, 'skip'::text, 'relaunch'::text, 'boost'::text]));
