-- Clean, human-readable slugs for user_collections.
-- Run in Supabase SQL editor.

-- Required before creating slugify(). Supabase usually installs extensions here.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- 1) Slugify helper: lowercase, strip diacritics, keep [a-z0-9-], collapse dashes.
CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(extensions.unaccent(coalesce(_input, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  );
$$;

-- 2) Unique slug generator for user_collections.
CREATE OR REPLACE FUNCTION public.generate_unique_collection_slug(_name text, _id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  base := public.slugify(_name);
  IF base IS NULL OR length(base) = 0 THEN
    base := 'collection';
  END IF;
  candidate := base;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_collections
      WHERE slug = candidate AND (_id IS NULL OR id <> _id)
    );
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  RETURN candidate;
END;
$$;

-- 3) Trigger: assign slug from name on insert / when name changes and slug is blank.
CREATE OR REPLACE FUNCTION public.set_collection_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL
     OR length(NEW.slug) = 0
     OR NEW.slug ~ '^[0-9a-f]{32}$'  -- legacy hex slug
     OR (TG_OP = 'UPDATE' AND NEW.name IS DISTINCT FROM OLD.name AND NEW.slug = OLD.slug AND OLD.slug ~ '^[0-9a-f]{32}$')
  THEN
    NEW.slug := public.generate_unique_collection_slug(NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_collection_slug ON public.user_collections;
CREATE TRIGGER trg_set_collection_slug
BEFORE INSERT OR UPDATE ON public.user_collections
FOR EACH ROW EXECUTE FUNCTION public.set_collection_slug();

-- 4) Backfill: rewrite any existing hex/uuid-style slugs to readable ones.
UPDATE public.user_collections
SET slug = public.generate_unique_collection_slug(name, id)
WHERE slug ~ '^[0-9a-f]{32}$' OR slug ~ '^[0-9a-f-]{36}$' OR slug IS NULL OR length(slug) = 0;
