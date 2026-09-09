-- The prior job sent the literal placeholder YOUR_SERVICE_ROLE_KEY, so every
-- daily request reached the protected function without valid credentials.
INSERT INTO public.internal_cron_tokens (name)
VALUES ('generate-blog-post')
ON CONFLICT (name) DO NOTHING;

DO $do$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid, schedule
    FROM cron.job
    WHERE jobname = 'generate-blog-post-daily'
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
    PERFORM cron.schedule(
      'generate-blog-post-daily',
      existing_job.schedule,
      $schedule$
        SELECT net.http_post(
          url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-token', (
              SELECT token::text
              FROM public.internal_cron_tokens
              WHERE name = 'generate-blog-post'
            )
          ),
          body := jsonb_build_object('source', 'cron'),
          timeout_milliseconds := 30000
        );
      $schedule$
    );
  END LOOP;

  IF NOT FOUND THEN
    PERFORM cron.schedule(
      'generate-blog-post-daily',
      '0 14 * * *',
      $schedule$
        SELECT net.http_post(
          url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-token', (
              SELECT token::text
              FROM public.internal_cron_tokens
              WHERE name = 'generate-blog-post'
            )
          ),
          body := jsonb_build_object('source', 'cron'),
          timeout_milliseconds := 30000
        );
      $schedule$
    );
  END IF;
END;
$do$;
