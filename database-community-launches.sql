-- ============================================
-- Community Launches & Founder Claiming System
-- ============================================
-- Run this in the Supabase SQL editor.

-- 1. Extend products table -------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS submission_type text NOT NULL DEFAULT 'founder'
    CHECK (submission_type IN ('founder', 'community')),
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_submitter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Backfill submitted_by_user_id from owner_id for existing rows
UPDATE public.products
   SET submitted_by_user_id = owner_id
 WHERE submitted_by_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_submission_type ON public.products (submission_type);
CREATE INDEX IF NOT EXISTS idx_products_submitted_by_user_id ON public.products (submitted_by_user_id);

-- 2. product_claims table --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  claimant_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_method text NOT NULL CHECK (verification_method IN ('email_domain', 'verified_founder', 'admin')),
  verification_email text,
  verification_code_hash text,
  code_expires_at timestamptz,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_product_claims_product ON public.product_claims (product_id);
CREATE INDEX IF NOT EXISTS idx_product_claims_claimant ON public.product_claims (claimant_user_id);
CREATE INDEX IF NOT EXISTS idx_product_claims_status ON public.product_claims (status);

GRANT SELECT, INSERT, UPDATE ON public.product_claims TO authenticated;
GRANT ALL ON public.product_claims TO service_role;

ALTER TABLE public.product_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claimants can view own claims" ON public.product_claims;
CREATE POLICY "Claimants can view own claims"
  ON public.product_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = claimant_user_id);

DROP POLICY IF EXISTS "Claimants can create claims" ON public.product_claims;
CREATE POLICY "Claimants can create claims"
  ON public.product_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = claimant_user_id);

DROP POLICY IF EXISTS "Admins can view all claims" ON public.product_claims;
CREATE POLICY "Admins can view all claims"
  ON public.product_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Admins can update claims" ON public.product_claims;
CREATE POLICY "Admins can update claims"
  ON public.product_claims FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. product_reports table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_reports_product ON public.product_reports (product_id);
CREATE INDEX IF NOT EXISTS idx_product_reports_status ON public.product_reports (status);

GRANT SELECT, INSERT ON public.product_reports TO authenticated;
GRANT ALL ON public.product_reports TO service_role;

ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can report" ON public.product_reports;
CREATE POLICY "Anyone authenticated can report"
  ON public.product_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Reporters can view own reports" ON public.product_reports;
CREATE POLICY "Reporters can view own reports"
  ON public.product_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Admins can view all reports" ON public.product_reports;
CREATE POLICY "Admins can view all reports"
  ON public.product_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. founder_outreach_log --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attempted_emails text[] NOT NULL DEFAULT '{}',
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id)
);

GRANT SELECT ON public.founder_outreach_log TO authenticated;
GRANT ALL ON public.founder_outreach_log TO service_role;

ALTER TABLE public.founder_outreach_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read outreach log" ON public.founder_outreach_log;
CREATE POLICY "Admins read outreach log"
  ON public.founder_outreach_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );
