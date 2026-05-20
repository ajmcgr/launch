-- Collections feature setup
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.user_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  is_public boolean NOT NULL DEFAULT false,
  slug text UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_collections_user ON public.user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_public ON public.user_collections(is_public) WHERE is_public = true;

CREATE TABLE IF NOT EXISTS public.user_collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.user_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  note text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collection_items_collection ON public.user_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_items_product ON public.user_collection_items(product_id);

CREATE OR REPLACE FUNCTION public.touch_user_collection_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.user_collections SET updated_at = now()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_user_collection_items_touch ON public.user_collection_items;
CREATE TRIGGER trg_user_collection_items_touch
AFTER INSERT OR DELETE OR UPDATE ON public.user_collection_items
FOR EACH ROW EXECUTE FUNCTION public.touch_user_collection_updated_at();

CREATE OR REPLACE FUNCTION public.touch_user_collection_self()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_user_collections_touch_self ON public.user_collections;
CREATE TRIGGER trg_user_collections_touch_self
BEFORE UPDATE ON public.user_collections
FOR EACH ROW EXECUTE FUNCTION public.touch_user_collection_self();

CREATE OR REPLACE FUNCTION public.user_collection_is_visible(_collection_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_collections c
    WHERE c.id = _collection_id AND (c.is_public = true OR c.user_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.user_collection_is_owned(_collection_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_collections c
    WHERE c.id = _collection_id AND c.user_id = auth.uid()
  );
$$;

ALTER TABLE public.user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collections visible to owner or if public" ON public.user_collections;
CREATE POLICY "Collections visible to owner or if public"
  ON public.user_collections FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own collections" ON public.user_collections;
CREATE POLICY "Users insert own collections"
  ON public.user_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own collections" ON public.user_collections;
CREATE POLICY "Users update own collections"
  ON public.user_collections FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own collections" ON public.user_collections;
CREATE POLICY "Users delete own collections"
  ON public.user_collections FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Items visible when parent visible" ON public.user_collection_items;
CREATE POLICY "Items visible when parent visible"
  ON public.user_collection_items FOR SELECT
  USING (public.user_collection_is_visible(collection_id));

DROP POLICY IF EXISTS "Owner inserts items" ON public.user_collection_items;
CREATE POLICY "Owner inserts items"
  ON public.user_collection_items FOR INSERT
  WITH CHECK (public.user_collection_is_owned(collection_id));

DROP POLICY IF EXISTS "Owner updates items" ON public.user_collection_items;
CREATE POLICY "Owner updates items"
  ON public.user_collection_items FOR UPDATE
  USING (public.user_collection_is_owned(collection_id));

DROP POLICY IF EXISTS "Owner deletes items" ON public.user_collection_items;
CREATE POLICY "Owner deletes items"
  ON public.user_collection_items FOR DELETE
  USING (public.user_collection_is_owned(collection_id));

-- Optional seed: a public "Editor's Picks" collection (commented out by default)
-- INSERT INTO public.user_collections (user_id, name, description, is_public, slug)
-- VALUES ('<user-uuid>', 'Editor''s Picks', 'A handpicked selection of standout launches.', true, 'editors-picks');
