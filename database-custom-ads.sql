-- ============================================================
-- Custom Ads support (additive, backward-compatible)
-- ============================================================
-- Run this in the Supabase SQL editor.
-- All changes are additive: existing product-ad rows keep working
-- unchanged (ad_type defaults to 'product').

-- 1. Make product_id nullable so custom ads (no product) can be stored
ALTER TABLE public.sponsored_products
  ALTER COLUMN product_id DROP NOT NULL;

-- 2. Add custom-ad columns
ALTER TABLE public.sponsored_products
  ADD COLUMN IF NOT EXISTS ad_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS custom_image_url text,
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS custom_description text,
  ADD COLUMN IF NOT EXISTS custom_target_url text;

-- 3. Constrain ad_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sponsored_products_ad_type_check'
  ) THEN
    ALTER TABLE public.sponsored_products
      ADD CONSTRAINT sponsored_products_ad_type_check
      CHECK (ad_type IN ('product', 'custom'));
  END IF;
END$$;

-- 4. Integrity: product ads require product_id, custom ads require creative fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sponsored_products_ad_payload_check'
  ) THEN
    ALTER TABLE public.sponsored_products
      ADD CONSTRAINT sponsored_products_ad_payload_check
      CHECK (
        (ad_type = 'product' AND product_id IS NOT NULL)
        OR
        (ad_type = 'custom'
          AND custom_image_url IS NOT NULL
          AND custom_title IS NOT NULL
          AND custom_target_url IS NOT NULL
          AND custom_target_url ~* '^https://')
      );
  END IF;
END$$;

-- 5. Storage bucket for uploaded custom ad creatives (public, 5MB cap)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-creatives',
  'ad-creatives',
  true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 6. Storage RLS: authenticated users can upload to their own folder; public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ad-creatives read public'
  ) THEN
    CREATE POLICY "ad-creatives read public"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'ad-creatives');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ad-creatives insert own'
  ) THEN
    CREATE POLICY "ad-creatives insert own"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'ad-creatives'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ad-creatives update own'
  ) THEN
    CREATE POLICY "ad-creatives update own"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'ad-creatives'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'ad-creatives delete own'
  ) THEN
    CREATE POLICY "ad-creatives delete own"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'ad-creatives'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END$$;

-- ============================================================
-- Rollback (only if needed):
-- ALTER TABLE public.sponsored_products
--   DROP CONSTRAINT IF EXISTS sponsored_products_ad_payload_check,
--   DROP CONSTRAINT IF EXISTS sponsored_products_ad_type_check,
--   DROP COLUMN IF EXISTS custom_target_url,
--   DROP COLUMN IF EXISTS custom_description,
--   DROP COLUMN IF EXISTS custom_title,
--   DROP COLUMN IF EXISTS custom_image_url,
--   DROP COLUMN IF EXISTS ad_type;
-- (product_id column can stay nullable; no destructive change needed.)
-- ============================================================
