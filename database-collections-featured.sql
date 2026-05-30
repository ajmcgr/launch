-- Add is_featured flag to user_collections for admin curation.
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_collections_featured
  ON public.user_collections(is_featured) WHERE is_featured = true;

-- Allow admins to update is_featured (RLS).
DROP POLICY IF EXISTS "Admins can update any collection" ON public.user_collections;
CREATE POLICY "Admins can update any collection"
  ON public.user_collections
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
