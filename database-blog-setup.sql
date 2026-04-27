-- ===============================================================
-- BLOG POSTS — run this in Supabase SQL Editor to set up the table
-- ===============================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text,
  content_md text NOT NULL,
  cover_image_url text,
  meta_title text,
  meta_description text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  ai_generated boolean DEFAULT false,
  topic_seed text,
  view_count integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON public.blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Admins can manage all blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage all blog posts"
  ON public.blog_posts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at_blog_posts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_blog_posts();

-- ===============================================================
-- CRON: Every 3 days at 14:00 UTC -> generate-blog-post
-- (requires pg_cron + pg_net extensions, which you already have)
-- ===============================================================

SELECT cron.unschedule('generate-blog-post-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-weekly');

SELECT cron.unschedule('generate-blog-post-every-3-days')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-every-3-days');

SELECT cron.schedule(
  'generate-blog-post-every-3-days',
  '0 14 */3 * *',
  $$
  SELECT net.http_post(
    url := 'https://qzwoyflbcozbfcjkqglv.supabase.co/functions/v1/generate-blog-post',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('source', 'cron')
  );
  $$
);
