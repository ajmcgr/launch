-- Create RLS policies for product-media storage bucket
-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload product media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-media');

-- Allow users to read product media
CREATE POLICY "Anyone can view product media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-media');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own product media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own product media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-media' AND auth.uid()::text = (storage.foldername(name))[1]);