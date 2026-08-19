-- Launch Digest ("New Launches" email) — run in Supabase SQL Editor
-- Smallest safe changes: one column on users + two small tracking tables.

-- 1. Preference on the existing profile table.
--    Safe default 'off' — existing users are NOT auto-subscribed.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS launch_digest_frequency TEXT NOT NULL DEFAULT 'off';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_launch_digest_frequency_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_launch_digest_frequency_check
      CHECK (launch_digest_frequency IN ('daily', 'weekly', 'off'));
  END IF;
END $$;

-- Stable per-user token for one-click unsubscribe links in emails.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS digest_unsub_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_users_launch_digest_frequency
  ON public.users (launch_digest_frequency)
  WHERE launch_digest_frequency <> 'off';

-- 2. Dedupe / delivery log. One row per user per digest period.
CREATE TABLE IF NOT EXISTS public.digest_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  period_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  resend_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, digest_type, period_key)
);

GRANT ALL ON public.digest_sends TO service_role;
ALTER TABLE public.digest_sends ENABLE ROW LEVEL SECURITY;

-- 3. Lightweight analytics (sends / opens / clicks / unsubscribes).
CREATE TABLE IF NOT EXISTS public.digest_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_type TEXT NOT NULL,
  period_key TEXT,
  event_type TEXT NOT NULL,
  user_id UUID,
  product_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_digest_events_type_date
  ON public.digest_events (digest_type, created_at DESC);

GRANT ALL ON public.digest_events TO service_role;
ALTER TABLE public.digest_events ENABLE ROW LEVEL SECURITY;

-- 4. Schedules (pg_cron). Daily 13:00 UTC, weekly Monday 14:00 UTC.
--    Replace <SERVICE_ROLE_KEY> before running.
--
-- SELECT cron.schedule(
--   'send-launch-digest-daily', '0 13 * * *',
--   $$ SELECT net.http_post(
--        url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-launch-digest',
--        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_KEY>'),
--        body := '{"type":"daily"}'::jsonb) $$
-- );
--
-- SELECT cron.schedule(
--   'send-launch-digest-weekly', '0 14 * * 1',
--   $$ SELECT net.http_post(
--        url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-launch-digest',
--        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <SERVICE_ROLE_KEY>'),
--        body := '{"type":"weekly"}'::jsonb) $$
-- );
