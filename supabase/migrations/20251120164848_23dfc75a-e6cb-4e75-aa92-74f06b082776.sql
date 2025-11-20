-- Make product fields nullable for drafts
ALTER TABLE public.products 
  ALTER COLUMN name DROP NOT NULL,
  ALTER COLUMN tagline DROP NOT NULL,
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN domain_url DROP NOT NULL,
  ALTER COLUMN slug DROP NOT NULL;

-- Add unique constraint on slug only for non-null values
CREATE UNIQUE INDEX products_slug_unique ON public.products (slug) WHERE slug IS NOT NULL;