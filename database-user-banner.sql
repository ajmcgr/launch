-- Add a custom banner image to user profiles.
-- Run in Supabase SQL editor.

-- 1) Column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS banner_image_url text;

-- 2) Storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-banners', 'user-banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3) Storage policies — owner-scoped by first folder = auth.uid()
DROP POLICY IF EXISTS "Public can read user banners" ON storage.objects;
CREATE POLICY "Public can read user banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-banners');

DROP POLICY IF EXISTS "Users can upload own banner" ON storage.objects;
CREATE POLICY "Users can upload own banner"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own banner" ON storage.objects;
CREATE POLICY "Users can update own banner"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own banner" ON storage.objects;
CREATE POLICY "Users can delete own banner"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
