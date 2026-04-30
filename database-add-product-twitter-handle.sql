-- Add an optional X (Twitter) handle override per product.
-- When a launch goes live, the auto-tweet uses this handle if set,
-- otherwise it falls back to the product owner's profile twitter handle.
-- Run once in the Supabase SQL editor.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

COMMENT ON COLUMN public.products.twitter_handle IS
  'Optional X handle (without @) to tag in the auto-launch tweet. Overrides the maker''s profile handle.';
