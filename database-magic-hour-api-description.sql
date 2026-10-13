-- Add the Magic Hour API paragraph to their product description.
-- Run in: Supabase Dashboard -> SQL Editor (project: gzpypxgdkxdynovploxn)
-- Idempotent: safe to run more than once.

UPDATE public.products
SET description = description || E'\n\nMagic Hour also provides a REST API for supported video, image and audio tools, with official Python, Node.js, Go and Rust SDKs. API documentation: https://docs.magichour.ai/introduction. Generations use Magic Hour credits.'
WHERE slug = 'magic-hour'
  AND description NOT LIKE '%docs.magichour.ai%';
