-- Add badge verification fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS badge_embedded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS badge_verified_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_badge_check timestamp with time zone DEFAULT NULL;

-- Add index for verification status
CREATE INDEX IF NOT EXISTS idx_products_badge_embedded ON public.products(badge_embedded);

-- Add comment
COMMENT ON COLUMN public.products.badge_embedded IS 'Whether the product has a verified badge embed with dofollow link to trylaunch.ai';
COMMENT ON COLUMN public.products.badge_verified_at IS 'When the badge was last successfully verified';
COMMENT ON COLUMN public.products.last_badge_check IS 'When we last checked for badge presence';