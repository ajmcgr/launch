-- Add pinned column to comments table
ALTER TABLE public.comments ADD COLUMN pinned boolean DEFAULT false;

-- Create index for efficient pinned comment queries
CREATE INDEX idx_comments_pinned ON public.comments(product_id, pinned) WHERE pinned = true;

-- Only allow one pinned comment per product (enforced via trigger)
CREATE OR REPLACE FUNCTION public.enforce_single_pinned_comment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pinned = true THEN
    -- Unpin any existing pinned comment for this product
    UPDATE public.comments 
    SET pinned = false 
    WHERE product_id = NEW.product_id 
      AND pinned = true 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_single_pinned_comment_trigger
BEFORE INSERT OR UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_pinned_comment();

-- RLS policy: Only product owners can pin/unpin comments on their products
CREATE POLICY "Product owners can pin comments"
ON public.comments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = comments.product_id 
    AND products.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = comments.product_id 
    AND products.owner_id = auth.uid()
  )
);