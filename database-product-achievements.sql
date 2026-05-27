-- Founder Milestone System: product_achievements
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.product_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL,
  achievement_type text NOT NULL,
  metric_value numeric,
  metric_label text,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  email_status text NOT NULL DEFAULT 'pending',
  email_sent_at timestamptz,
  share_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (product_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_product_achievements_founder
  ON public.product_achievements (founder_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_achievements_product
  ON public.product_achievements (product_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_achievements_type
  ON public.product_achievements (achievement_type, achieved_at DESC);

GRANT SELECT ON public.product_achievements TO anon;
GRANT SELECT, UPDATE ON public.product_achievements TO authenticated;
GRANT ALL ON public.product_achievements TO service_role;

ALTER TABLE public.product_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Achievements are publicly readable" ON public.product_achievements;
CREATE POLICY "Achievements are publicly readable"
  ON public.product_achievements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Founders can update their achievements" ON public.product_achievements;
CREATE POLICY "Founders can update their achievements"
  ON public.product_achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = founder_id)
  WITH CHECK (auth.uid() = founder_id);

-- Optional: schedule the detection edge function hourly (replace project ref + service key).
-- SELECT cron.schedule(
--   'detect-milestones-hourly',
--   '0 * * * *',
--   $$SELECT net.http_post(
--       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/detect-milestones',
--       headers := jsonb_build_object('Authorization','Bearer YOUR_SERVICE_ROLE_KEY','Content-Type','application/json'),
--       body := '{}'::jsonb
--   );$$
-- );
