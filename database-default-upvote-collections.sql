-- Default "username" collection per user, auto-synced from upvotes.
-- Run this in the Supabase SQL Editor.

-- 1) Flag column + uniqueness (one default upvotes collection per user)
ALTER TABLE public.user_collections
  ADD COLUMN IF NOT EXISTS is_upvotes_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_upvotes_default
  ON public.user_collections(user_id)
  WHERE is_upvotes_default = true;

-- 2) Helper: ensure default collection exists for a user, returns its id
CREATE OR REPLACE FUNCTION public.ensure_upvotes_default_collection(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
  _uname text;
BEGIN
  SELECT id INTO _cid
  FROM public.user_collections
  WHERE user_id = _user_id AND is_upvotes_default = true
  LIMIT 1;

  IF _cid IS NOT NULL THEN
    RETURN _cid;
  END IF;

  SELECT username INTO _uname FROM public.users WHERE id = _user_id;
  IF _uname IS NULL OR length(trim(_uname)) = 0 THEN
    _uname := 'saved';
  END IF;

  INSERT INTO public.user_collections (user_id, name, description, is_public, is_upvotes_default)
  VALUES (_user_id, _uname, 'Products I''ve upvoted', true, true)
  RETURNING id INTO _cid;

  RETURN _cid;
END;
$$;

-- 3) Backfill: create one default collection per user with any upvote
INSERT INTO public.user_collections (user_id, name, description, is_public, is_upvotes_default)
SELECT DISTINCT v.user_id,
       COALESCE(NULLIF(trim(u.username), ''), 'saved'),
       'Products I''ve upvoted',
       true,
       true
FROM public.votes v
JOIN public.users u ON u.id = v.user_id
WHERE v.value = 1
  AND NOT EXISTS (
    SELECT 1 FROM public.user_collections c
    WHERE c.user_id = v.user_id AND c.is_upvotes_default = true
  );

-- 4) Backfill items from existing upvotes
INSERT INTO public.user_collection_items (collection_id, product_id)
SELECT c.id, v.product_id
FROM public.votes v
JOIN public.user_collections c
  ON c.user_id = v.user_id AND c.is_upvotes_default = true
WHERE v.value = 1
ON CONFLICT (collection_id, product_id) DO NOTHING;

-- 5) Trigger: keep default collection in sync with votes
CREATE OR REPLACE FUNCTION public.sync_upvote_to_default_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.value = 1 THEN
      _cid := public.ensure_upvotes_default_collection(NEW.user_id);
      INSERT INTO public.user_collection_items (collection_id, product_id)
      VALUES (_cid, NEW.product_id)
      ON CONFLICT (collection_id, product_id) DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.value = 1 AND (OLD.value IS DISTINCT FROM 1) THEN
      _cid := public.ensure_upvotes_default_collection(NEW.user_id);
      INSERT INTO public.user_collection_items (collection_id, product_id)
      VALUES (_cid, NEW.product_id)
      ON CONFLICT (collection_id, product_id) DO NOTHING;
    ELSIF OLD.value = 1 AND (NEW.value IS DISTINCT FROM 1) THEN
      DELETE FROM public.user_collection_items i
      USING public.user_collections c
      WHERE i.collection_id = c.id
        AND c.user_id = OLD.user_id
        AND c.is_upvotes_default = true
        AND i.product_id = OLD.product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value = 1 THEN
      DELETE FROM public.user_collection_items i
      USING public.user_collections c
      WHERE i.collection_id = c.id
        AND c.user_id = OLD.user_id
        AND c.is_upvotes_default = true
        AND i.product_id = OLD.product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_upvote_to_default_collection ON public.votes;
CREATE TRIGGER trg_sync_upvote_to_default_collection
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.sync_upvote_to_default_collection();
