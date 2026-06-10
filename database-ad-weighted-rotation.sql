-- Adds a `weight` column to ad inventory tables.
-- A higher weight makes that ad more likely to be picked during rotation.
-- Default = 1 (equal probability).
-- Run this once via Supabase SQL editor.

ALTER TABLE public.sponsored_products
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1 CHECK (weight >= 0);

ALTER TABLE public.homepage_sponsors
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1 CHECK (weight >= 0);

ALTER TABLE public.category_sponsors
  ADD COLUMN IF NOT EXISTS weight INT NOT NULL DEFAULT 1 CHECK (weight >= 0);
