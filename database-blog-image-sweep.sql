-- Automatic Gemini blog artwork sweep.
--
-- Replaces every existing blog cover with Gemini-generated artwork, 3 posts at a
-- time, every 10 minutes, until no post is left without artwork. No admin
-- button required — the job simply finds nothing to do once the archive is done.
--
-- The image pipeline is the only thing that ever writes blog_posts.image_prompt,
-- so "image_prompt IS NULL" == "still using the old/default cover".
--
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY before running.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('blog-image-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'blog-image-sweep');

SELECT cron.schedule(
  'blog-image-sweep',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-blog-image',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('auto', true, 'limit', 3),
    timeout_milliseconds := 120000
  );
  $$
);

-- Progress check:
--   SELECT count(*) FILTER (WHERE image_prompt IS NULL) AS remaining,
--          count(*) AS total
--   FROM blog_posts;
--
-- When remaining = 0 you can stop the sweep (optional — it is a no-op):
--   SELECT cron.unschedule('blog-image-sweep');
