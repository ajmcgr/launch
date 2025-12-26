-- Create sponsored_products table for managing sponsored listings
CREATE TABLE public.sponsored_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  sponsorship_type TEXT NOT NULL CHECK (sponsorship_type IN ('website', 'newsletter', 'combined')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure no duplicate positions for overlapping date ranges
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Create index for efficient querying of active sponsors
CREATE INDEX idx_sponsored_products_dates ON public.sponsored_products(start_date, end_date);
CREATE INDEX idx_sponsored_products_position ON public.sponsored_products(position);

-- Enable Row Level Security
ALTER TABLE public.sponsored_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view sponsored products (needed for homepage display)
CREATE POLICY "Sponsored products are viewable by everyone" 
ON public.sponsored_products 
FOR SELECT 
USING (true);

-- Only admins can manage sponsored products
CREATE POLICY "Only admins can manage sponsored products" 
ON public.sponsored_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));