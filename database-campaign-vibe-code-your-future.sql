-- Vibe Code Your Future campaign
--
-- Reuses the existing products table: the campaign is just metadata on a normal
-- Launch submission. Plus a lightweight analytics table for campaign events.

-- 1) Campaign tag on products -------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS campaign text;

CREATE INDEX IF NOT EXISTS products_campaign_idx
  ON public.products (campaign)
  WHERE campaign IS NOT NULL;

-- 2) Campaign analytics -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign text NOT NULL,
  event_type text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.campaign_events TO authenticated;
GRANT INSERT ON public.campaign_events TO anon;
GRANT ALL ON public.campaign_events TO service_role;

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can record campaign events" ON public.campaign_events;
CREATE POLICY "Anyone can record campaign events"
  ON public.campaign_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read campaign events" ON public.campaign_events;
CREATE POLICY "Admins can read campaign events"
  ON public.campaign_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS campaign_events_campaign_idx
  ON public.campaign_events (campaign, event_type, created_at DESC);

-- Progress check:
--   SELECT event_type, count(*) FROM campaign_events
--   WHERE campaign = 'vibe_code_your_future' GROUP BY 1 ORDER BY 2 DESC;
