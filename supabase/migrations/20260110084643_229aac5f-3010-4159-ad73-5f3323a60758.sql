-- Add platforms column to products table (array of platform types)
ALTER TABLE public.products 
ADD COLUMN platforms text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.products.platforms IS 'Array of platforms: web, ios, android';