-- Notification rows are created by SECURITY DEFINER triggers and service-role
-- Edge Functions. Browser roles only need to read and mark their own rows.
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
REVOKE INSERT ON TABLE public.notifications FROM anon, authenticated;

-- Stripe Connect callbacks use a short-lived, one-time state stored server-side.
CREATE TABLE IF NOT EXISTS public.stripe_connect_oauth_states (
  state_token uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_connect_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_connect_oauth_states FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS stripe_connect_oauth_states_expiry_idx
  ON public.stripe_connect_oauth_states (expires_at);

-- Reuse the protected cron-token store introduced for renewal reminders.
INSERT INTO public.internal_cron_tokens (name)
VALUES
  ('send-launch-share-email'),
  ('send-trending-maker-email')
ON CONFLICT (name) DO NOTHING;

-- Preserve the names and schedules of any existing pg_cron jobs while replacing
-- their public calls with token-authenticated requests.
DO $do$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid, jobname, schedule
    FROM cron.job
    WHERE command LIKE '%/functions/v1/send-launch-share-email%'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
    PERFORM cron.schedule(
      existing_job.jobname,
      existing_job.schedule,
      $command$
        SELECT net.http_post(
          url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-launch-share-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-token', (
              SELECT token::text
              FROM public.internal_cron_tokens
              WHERE name = 'send-launch-share-email'
            )
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  END LOOP;

  FOR existing_job IN
    SELECT jobid, jobname, schedule
    FROM cron.job
    WHERE command LIKE '%/functions/v1/send-trending-maker-email%'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
    PERFORM cron.schedule(
      existing_job.jobname,
      existing_job.schedule,
      $command$
        SELECT net.http_post(
          url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/send-trending-maker-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-token', (
              SELECT token::text
              FROM public.internal_cron_tokens
              WHERE name = 'send-trending-maker-email'
            )
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  END LOOP;
END;
$do$;
