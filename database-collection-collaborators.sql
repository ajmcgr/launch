-- Invite-only collaborative collections
-- Run this migration to enable shared collections with attribution.

-- 1) Collaborators table
CREATE TABLE IF NOT EXISTS public.collection_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.user_collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_collaborators_collection ON public.collection_collaborators(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_collaborators_user ON public.collection_collaborators(user_id);

GRANT SELECT ON public.collection_collaborators TO anon;
GRANT SELECT, INSERT, DELETE ON public.collection_collaborators TO authenticated;
GRANT ALL ON public.collection_collaborators TO service_role;

ALTER TABLE public.collection_collaborators ENABLE ROW LEVEL SECURITY;

-- Anyone can read (used to render collaborators on public collections + permission checks)
DROP POLICY IF EXISTS "Collaborators readable" ON public.collection_collaborators;
CREATE POLICY "Collaborators readable"
  ON public.collection_collaborators FOR SELECT
  USING (true);

-- Only the collection owner can invite
DROP POLICY IF EXISTS "Owner invites collaborators" ON public.collection_collaborators;
CREATE POLICY "Owner invites collaborators"
  ON public.collection_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

-- Owner can remove a collaborator; collaborator can remove themself
DROP POLICY IF EXISTS "Owner or self removes collaborator" ON public.collection_collaborators;
CREATE POLICY "Owner or self removes collaborator"
  ON public.collection_collaborators FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );

-- 2) Attribution column on items
ALTER TABLE public.user_collection_items
  ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: assume existing items were added by the collection owner.
UPDATE public.user_collection_items i
SET added_by = c.user_id
FROM public.user_collections c
WHERE i.collection_id = c.id AND i.added_by IS NULL;

-- 3) Security-definer helper to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.is_collection_collaborator(_collection_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collection_collaborators
    WHERE collection_id = _collection_id AND user_id = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_collection_collaborator(uuid, uuid) TO anon, authenticated, service_role;

-- 4) Replace insert/delete policies on user_collection_items to support collaborators
DROP POLICY IF EXISTS "Owner inserts items" ON public.user_collection_items;
CREATE POLICY "Owner or collaborator inserts items"
  ON public.user_collection_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.user_collections c
        WHERE c.id = collection_id AND c.user_id = auth.uid()
      )
      OR public.is_collection_collaborator(collection_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owner deletes items" ON public.user_collection_items;
CREATE POLICY "Owner or contributor deletes items"
  ON public.user_collection_items FOR DELETE
  USING (
    added_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_collections c
      WHERE c.id = collection_id AND c.user_id = auth.uid()
    )
  );
