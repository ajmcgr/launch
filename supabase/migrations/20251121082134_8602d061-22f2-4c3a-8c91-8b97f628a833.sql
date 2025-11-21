-- Create product_follows table for users to follow products
CREATE TABLE IF NOT EXISTS public.product_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (follower_id, product_id)
);

-- Enable RLS
ALTER TABLE public.product_follows ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view product follows
CREATE POLICY "Product follows are viewable by everyone"
ON public.product_follows
FOR SELECT
USING (true);

-- Policy: Users can follow products
CREATE POLICY "Users can follow products"
ON public.product_follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Policy: Users can unfollow products
CREATE POLICY "Users can unfollow products"
ON public.product_follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Create index for better query performance
CREATE INDEX idx_product_follows_follower ON public.product_follows(follower_id);
CREATE INDEX idx_product_follows_product ON public.product_follows(product_id);