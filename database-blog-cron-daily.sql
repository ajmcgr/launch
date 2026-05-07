-- ===============================================================
-- Switch blog generation cron to DAILY at 14:00 UTC
-- Run this in the Supabase SQL Editor.
-- ===============================================================

-- Remove old schedules if they exist
SELECT cron.unschedule('generate-blog-post-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-weekly');

SELECT cron.unschedule('generate-blog-post-every-3-days')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-every-3-days');

SELECT cron.unschedule('generate-blog-post-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-daily');

-- Schedule daily at 14:00 UTC
SELECT cron.schedule(
  'generate-blog-post-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);

-- Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'generate-blog-post%';
