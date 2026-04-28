-- Outreach automation: daily cron to score + send max 25 emails.
-- Runs daily at 14:00 UTC (10:00 AM ET). Conservative pacing protects sender reputation.
-- DEPLOY this in Supabase SQL Editor AFTER deploying the outreach-auto-send edge function.

-- 1. Ensure extensions (already enabled on most projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove any prior version of this job
SELECT cron.unschedule('outreach-auto-send-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'outreach-auto-send-daily');

-- 3. Schedule daily at 14:00 UTC
-- IMPORTANT: replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY below before running.
SELECT cron.schedule(
  'outreach-auto-send-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/outreach-auto-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('dailyCap', 25, 'minScore', 7, 'scoreLimit', 50)
  );
  $$
);

-- 4. Verify
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'outreach-auto-send-daily';
