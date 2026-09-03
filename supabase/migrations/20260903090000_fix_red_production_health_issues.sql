-- Restrict billing identifiers while preserving public access to profile fields.
REVOKE SELECT ON TABLE public.users FROM anon, authenticated;
REVOKE UPDATE ON TABLE public.users FROM anon, authenticated;

DO $$
DECLARE
  safe_columns text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO safe_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name NOT IN ('stripe_customer_id', 'stripe_subscription_id');

  EXECUTE 'GRANT SELECT (' || safe_columns || ') ON TABLE public.users TO anon, authenticated';
END;
$$;

GRANT UPDATE (
  avatar_url,
  banner_image_url,
  bio,
  email_notifications_enabled,
  instagram,
  launch_digest_frequency,
  linkedin,
  name,
  notify_on_comment,
  notify_on_follow,
  notify_on_launch,
  notify_on_vote,
  telegram,
  twitter,
  username,
  website,
  youtube
) ON TABLE public.users TO authenticated;

-- Durable webhook claims prevent concurrent delivery and Stripe retries from
-- fulfilling the same event more than once.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id text;
BEGIN
  INSERT INTO public.stripe_webhook_events (event_id, event_type, status)
  VALUES (p_event_id, p_event_type, 'processing')
  ON CONFLICT (event_id) DO UPDATE
  SET status = 'processing',
      event_type = EXCLUDED.event_type,
      attempts = stripe_webhook_events.attempts + 1,
      last_error = NULL,
      updated_at = now()
  WHERE stripe_webhook_events.status = 'failed'
     OR (
       stripe_webhook_events.status = 'processing'
       AND stripe_webhook_events.updated_at < now() - interval '5 minutes'
     )
  RETURNING event_id INTO claimed_id;

  RETURN claimed_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_webhook_event(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_webhook_event(text, text) TO service_role;

-- Advertising fulfillment is all-or-nothing across every purchased month.
ALTER TABLE public.sponsored_products
  ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS custom_image_url text,
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS custom_description text,
  ADD COLUMN IF NOT EXISTS custom_target_url text,
  ADD COLUMN IF NOT EXISTS checkout_session_id text,
  ADD COLUMN IF NOT EXISTS slot_month date;

ALTER TABLE public.sponsored_products ALTER COLUMN product_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sponsored_products_checkout_month_unique
  ON public.sponsored_products (checkout_session_id, slot_month)
  WHERE checkout_session_id IS NOT NULL AND slot_month IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fulfill_website_sponsorship(
  p_checkout_session_id text,
  p_product_id uuid,
  p_sponsorship_type text,
  p_ad_type text,
  p_start_dates date[],
  p_end_dates date[],
  p_custom_image_url text DEFAULT NULL,
  p_custom_title text DEFAULT NULL,
  p_custom_description text DEFAULT NULL,
  p_custom_target_url text DEFAULT NULL
)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  i integer;
  selected_position integer;
  inserted_id uuid;
BEGIN
  IF coalesce(array_length(p_start_dates, 1), 0) = 0
     OR array_length(p_start_dates, 1) <> array_length(p_end_dates, 1) THEN
    RAISE EXCEPTION 'INVALID_AD_MONTHS';
  END IF;

  IF p_sponsorship_type NOT IN ('website', 'combined')
     OR p_ad_type NOT IN ('product', 'custom') THEN
    RAISE EXCEPTION 'INVALID_AD_CONFIGURATION';
  END IF;

  IF (p_ad_type = 'product' AND p_product_id IS NULL)
     OR (p_ad_type = 'custom' AND (
       p_custom_image_url IS NULL OR p_custom_title IS NULL OR p_custom_target_url IS NULL
     )) THEN
    RAISE EXCEPTION 'INVALID_AD_CREATIVE';
  END IF;

  -- Lock each month in chronological order to serialize capacity allocation.
  PERFORM pg_advisory_xact_lock(hashtextextended('launch-ad:' || month_start::text, 0))
  FROM unnest(p_start_dates) AS month_start
  ORDER BY month_start;

  -- Validate every month before inserting any row.
  FOR i IN 1..array_length(p_start_dates, 1) LOOP
    IF (
      SELECT count(*)
      FROM public.sponsored_products
      WHERE start_date <= p_end_dates[i]
        AND end_date >= p_start_dates[i]
        AND sponsorship_type IN ('website', 'combined')
    ) >= 10 THEN
      RAISE EXCEPTION 'AD_INVENTORY_FULL:%', p_start_dates[i];
    END IF;
  END LOOP;

  FOR i IN 1..array_length(p_start_dates, 1) LOOP
    SELECT candidate_position
    INTO selected_position
    FROM generate_series(1, 10) AS slots(candidate_position)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.sponsored_products existing
      WHERE existing.position = candidate_position
        AND existing.start_date <= p_end_dates[i]
        AND existing.end_date >= p_start_dates[i]
        AND existing.sponsorship_type IN ('website', 'combined')
    )
    ORDER BY candidate_position
    LIMIT 1;

    IF selected_position IS NULL THEN
      RAISE EXCEPTION 'AD_INVENTORY_FULL:%', p_start_dates[i];
    END IF;

    INSERT INTO public.sponsored_products (
      product_id,
      position,
      sponsorship_type,
      start_date,
      end_date,
      ad_type,
      custom_image_url,
      custom_title,
      custom_description,
      custom_target_url,
      checkout_session_id,
      slot_month
    ) VALUES (
      p_product_id,
      selected_position,
      p_sponsorship_type,
      p_start_dates[i],
      p_end_dates[i],
      p_ad_type,
      p_custom_image_url,
      p_custom_title,
      p_custom_description,
      p_custom_target_url,
      p_checkout_session_id,
      p_start_dates[i]
    )
    RETURNING id INTO inserted_id;

    RETURN NEXT inserted_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_website_sponsorship(
  text, uuid, text, text, date[], date[], text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_website_sponsorship(
  text, uuid, text, text, date[], date[], text, text, text, text
) TO service_role;

-- A reminder is claimed before sending so retries cannot email the same renewal twice.
CREATE TABLE IF NOT EXISTS public.renewal_reminders_sent (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  renewal_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, renewal_date)
);

ALTER TABLE public.renewal_reminders_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.renewal_reminders_sent FROM anon, authenticated;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_source_event_unique
  ON public.notifications (source_event_key)
  WHERE source_event_key IS NOT NULL;

-- The scheduler and edge function share a database-generated token. It is not
-- readable through the API and never needs to be committed or copied manually.
CREATE TABLE IF NOT EXISTS public.internal_cron_tokens (
  name text PRIMARY KEY,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_cron_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.internal_cron_tokens FROM anon, authenticated;

INSERT INTO public.internal_cron_tokens (name)
VALUES ('send-renewal-reminders')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  FOR existing_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname IN ('send-renewal-reminders-daily', 'send-renewal-reminders-daily-secure')
  LOOP
    PERFORM cron.unschedule(existing_job_id);
  END LOOP;

  PERFORM cron.schedule(
    'send-renewal-reminders-daily-secure',
    '0 9 * * *',
    $schedule$
      SELECT net.http_post(
        url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-renewal-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-token', (
            SELECT token::text
            FROM public.internal_cron_tokens
            WHERE name = 'send-renewal-reminders'
          )
        ),
        body := '{}'::jsonb
      );
    $schedule$
  );
END;
$$;
