-- Table to track which trending maker emails have been sent (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.trending_maker_emails_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sent_at timestamptz DEFAULT now() NOT NULL
);

-- Index for quick lookups by user + date
CREATE INDEX idx_trending_maker_emails_user_date
  ON public.trending_maker_emails_sent (user_id, sent_at DESC);

-- RLS: only service role needs access (edge function uses service role key)
ALTER TABLE public.trending_maker_emails_sent ENABLE ROW LEVEL SECURITY;

-- pg_cron job: run every Monday at 14:00 UTC (10am ET)
-- Run this in the Supabase SQL Editor:
--
-- SELECT cron.schedule(
--   'send-trending-maker-emails-weekly',
--   '0 14 * * 1',
--   $$
--   SELECT net.http_post(
--     url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-trending-maker-email',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
