-- ===============================================================
-- Fix daily blog cron: include Authorization header so pg_cron's
-- net.http_post is accepted even if JWT enforcement is on.
-- Run in Supabase SQL Editor.
-- ===============================================================

DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-every-3-days'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Replace <SERVICE_ROLE_KEY> with the project's service_role key
-- (Supabase Dashboard → Project Settings → API → service_role key).
SELECT cron.schedule(
  'generate-blog-post-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 30000
  );
  $$
);

-- Verify it's scheduled:
-- SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'generate-blog-post-daily';

-- Test fire immediately to confirm the function is reachable:
-- SELECT net.http_post(
--   url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--   ),
--   body := jsonb_build_object('source', 'manual-test'),
--   timeout_milliseconds := 30000
-- );

-- Then check recent runs:
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
