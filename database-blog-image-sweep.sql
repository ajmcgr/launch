-- Automatic Gemini blog artwork sweep (project: gzpypxgdkxdynovploxn)
--
-- Why articles still show the default cover: this job was never scheduled, so
-- only the newest post ever received Gemini artwork. Run this file ONCE in the
-- Supabase SQL editor after replacing YOUR_SERVICE_ROLE_KEY.
--
-- It processes 3 posts every 10 minutes until no post is left without artwork
-- (image_prompt IS NULL == still on the old/default cover). It becomes a no-op
-- once the archive is done, so it is safe to leave scheduled.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

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

-- Optional: fire one batch immediately to confirm it works.
-- SELECT net.http_post(
--   url := 'https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/generate-blog-image',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
--     'apikey', 'YOUR_SERVICE_ROLE_KEY'
--   ),
--   body := jsonb_build_object('auto', true, 'limit', 3),
--   timeout_milliseconds := 120000
-- );
-- SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 3;

-- Progress check:
--   SELECT count(*) FILTER (WHERE image_prompt IS NULL) AS remaining, count(*) AS total
--   FROM blog_posts;
