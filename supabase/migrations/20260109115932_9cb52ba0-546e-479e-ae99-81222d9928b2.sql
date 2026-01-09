-- Drop the existing restrictive policy for tag management
DROP POLICY IF EXISTS "Only admins can manage tags" ON product_tags;

-- Allow authenticated users to create new tags
CREATE POLICY "Authenticated users can create tags"
ON product_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Keep admin-only for update and delete
CREATE POLICY "Only admins can update tags"
ON product_tags
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete tags"
ON product_tags
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));