-- Add languages array to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'::text[];

-- Create star ratings table
CREATE TABLE IF NOT EXISTS public.product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON public.product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON public.product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_products_languages ON public.products USING GIN(languages);

-- Enable RLS
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ratings
-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
ON public.product_ratings
FOR SELECT
USING (true);

-- Authenticated users can create ratings
CREATE POLICY "Authenticated users can rate products"
ON public.product_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON public.product_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
ON public.product_ratings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create view for average ratings
CREATE OR REPLACE VIEW public.product_rating_stats AS
SELECT 
  product_id,
  COUNT(*)::INTEGER AS rating_count,
  ROUND(AVG(rating)::NUMERIC, 1) AS average_rating
FROM public.product_ratings
GROUP BY product_id;

-- Function to get product rating stats
CREATE OR REPLACE FUNCTION public.get_product_rating(product_uuid UUID)
RETURNS TABLE(average_rating NUMERIC, rating_count INTEGER)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS average_rating,
    COUNT(*)::INTEGER AS rating_count
  FROM public.product_ratings
  WHERE product_id = product_uuid;
$$;