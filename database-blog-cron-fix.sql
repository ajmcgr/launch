-- ===============================================================
-- FIX: daily blog publishing + blog artwork sweep
-- Project: gzpypxgdkxdynovploxn
--
-- Why publishing stopped on Aug 2: `generate-blog-post` now requires cron
-- auth (isCronAuthorized), but the scheduled job was created WITHOUT an
-- Authorization header, so every daily run has returned 401.
--
-- Replace YOUR_SERVICE_ROLE_KEY (Dashboard → Project Settings → API →
-- service_role) everywhere below, then run this file once.
-- ===============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------- 1. Daily article at 14:00 UTC -----------------------
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-weekly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-every-3-days'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('generate-blog-post-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'generate-blog-post-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'apikey', 'YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('source', 'cron'),
    timeout_milliseconds := 30000
  );
  $$
);

-- ---------- 2. Artwork sweep every 10 minutes -------------------
DO $$ BEGIN PERFORM cron.unschedule('blog-image-sweep'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'blog-image-sweep',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-image',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'apikey', 'YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('auto', true, 'limit', 3),
    timeout_milliseconds := 120000
  );
  $$
);

-- ---------- 3. Test fire now (optional) -------------------------
-- SELECT net.http_post(
--   url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-post',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--     'apikey', 'YOUR_SERVICE_ROLE_KEY'
--   ),
--   body := jsonb_build_object('source', 'manual-test'),
--   timeout_milliseconds := 30000
-- );
-- SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;

-- ---------- 4. Verify -------------------------------------------
-- SELECT jobname, schedule, active FROM cron.job
-- WHERE jobname IN ('generate-blog-post-daily','blog-image-sweep');
