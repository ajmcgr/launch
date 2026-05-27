-- Category & Homepage Sponsorships
-- Run this in Supabase SQL editor.

-- =====================
-- Category Sponsorships
-- =====================
CREATE TABLE IF NOT EXISTS public.category_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id bigint NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  banner_image_url text NOT NULL,
  destination_url text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_sponsors_category ON public.category_sponsors(category_id);
CREATE INDEX IF NOT EXISTS idx_category_sponsors_dates ON public.category_sponsors(start_date, end_date);

GRANT SELECT ON public.category_sponsors TO anon, authenticated;
GRANT ALL ON public.category_sponsors TO service_role;

ALTER TABLE public.category_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read category sponsors" ON public.category_sponsors;
CREATE POLICY "Public can read category sponsors"
ON public.category_sponsors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage category sponsors" ON public.category_sponsors;
CREATE POLICY "Admins manage category sponsors"
ON public.category_sponsors FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_category_sponsor_impression(_sponsor_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.category_sponsors SET impressions = impressions + 1 WHERE id = _sponsor_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_category_sponsor_click(_sponsor_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.category_sponsors SET clicks = clicks + 1 WHERE id = _sponsor_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_category_sponsor_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_category_sponsor_click(uuid) TO anon, authenticated;

-- =====================
-- Homepage Sponsorships
-- =====================
CREATE TABLE IF NOT EXISTS public.homepage_sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_name text NOT NULL,
  banner_image_url text NOT NULL,
  destination_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sponsors_dates ON public.homepage_sponsors(start_date, end_date);

GRANT SELECT ON public.homepage_sponsors TO anon, authenticated;
GRANT ALL ON public.homepage_sponsors TO service_role;

ALTER TABLE public.homepage_sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read homepage sponsors" ON public.homepage_sponsors;
CREATE POLICY "Public can read homepage sponsors"
ON public.homepage_sponsors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage homepage sponsors" ON public.homepage_sponsors;
CREATE POLICY "Admins manage homepage sponsors"
ON public.homepage_sponsors FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_homepage_sponsor_impression(_sponsor_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.homepage_sponsors SET impressions = impressions + 1 WHERE id = _sponsor_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_homepage_sponsor_click(_sponsor_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.homepage_sponsors SET clicks = clicks + 1 WHERE id = _sponsor_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_homepage_sponsor_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_homepage_sponsor_click(uuid) TO anon, authenticated;

-- Seed existing hardcoded homepage banners (Media + Roach). Safe to skip if already done.
INSERT INTO public.homepage_sponsors (sponsor_name, banner_image_url, destination_url, position, start_date, end_date, enabled)
SELECT 'Media', '/src/assets/sponsors/media-banner.png', 'https://trymedia.ai/', 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sponsors WHERE sponsor_name = 'Media');

INSERT INTO public.homepage_sponsors (sponsor_name, banner_image_url, destination_url, position, start_date, end_date, enabled)
SELECT 'Roach', '/src/assets/sponsors/roach-banner.png', 'https://roachclo.com/', 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.homepage_sponsors WHERE sponsor_name = 'Roach');
