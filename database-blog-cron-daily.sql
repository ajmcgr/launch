-- ===============================================================
-- Switch blog generation cron to DAILY at 14:00 UTC
-- Run this in the Supabase SQL Editor.
-- ===============================================================

-- Remove old schedules if they exist without reading cron.job, which can be permission-restricted
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-every-3-days'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Schedule daily at 14:00 UTC
SELECT cron.schedule(
  'generate-blog-post-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 5000
  );
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'generate-blog-post%';
