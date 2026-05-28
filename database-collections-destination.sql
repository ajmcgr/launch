-- ============================================
-- Collections as Destination Pages
-- ============================================
-- Run this in the Supabase SQL editor.

-- 1. Extend user_collections ----------------------------------------------
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS view_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_collections_featured ON public.user_collections (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_user_collections_view_count ON public.user_collections (view_count DESC) WHERE is_public = true;

-- 2. collection_follows ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.user_collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_follows_collection ON public.collection_follows (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_follows_user ON public.collection_follows (user_id);

GRANT SELECT, INSERT, DELETE ON public.collection_follows TO authenticated;
GRANT SELECT ON public.collection_follows TO anon;
GRANT ALL ON public.collection_follows TO service_role;

ALTER TABLE public.collection_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read follows" ON public.collection_follows;
CREATE POLICY "Anyone can read follows"
  ON public.collection_follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users follow as themselves" ON public.collection_follows;
CREATE POLICY "Users follow as themselves"
  ON public.collection_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users unfollow own" ON public.collection_follows;
CREATE POLICY "Users unfollow own"
  ON public.collection_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. View-count increment helper ------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_collection_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_collections
     SET view_count = view_count + 1
   WHERE slug = _slug AND is_public = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_collection_view(text) TO anon, authenticated;

-- 4. Public read of basic collection profile for non-owners ---------------
-- (user_collections already allows public read via existing policy)
