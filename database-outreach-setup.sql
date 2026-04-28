-- ============================================
-- OUTREACH FEATURE — run this once in Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.outreach_lead_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  score int NOT NULL CHECK (score BETWEEN 0 AND 10),
  reason text,
  funding_status text CHECK (funding_status IN ('VC Backed','Angel Backed','Bootstrapped','Unknown')),
  funding_confidence int CHECK (funding_confidence BETWEEN 0 AND 100),
  funding_evidence text,
  scored_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_lead_scores_score ON public.outreach_lead_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_lead_scores_funding ON public.outreach_lead_scores(funding_status);

ALTER TABLE public.outreach_lead_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage lead scores" ON public.outreach_lead_scores;
CREATE POLICY "Admins manage lead scores" ON public.outreach_lead_scores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.outreach_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  startup_name text,
  subject text NOT NULL,
  status text NOT NULL,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_email_logs_email ON public.outreach_email_logs(email);
CREATE INDEX IF NOT EXISTS idx_outreach_email_logs_sent_at ON public.outreach_email_logs(sent_at DESC);

ALTER TABLE public.outreach_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage email logs" ON public.outreach_email_logs;
CREATE POLICY "Admins manage email logs" ON public.outreach_email_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
