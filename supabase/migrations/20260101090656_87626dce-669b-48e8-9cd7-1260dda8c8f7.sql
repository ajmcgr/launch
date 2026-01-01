-- Add a sponsor_analytics table to track enhanced sponsor-specific metrics
CREATE TABLE public.sponsor_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'impression' or 'click'
  visitor_id text,
  sponsored_position integer, -- Position in feed (1, 2, 3, 4)
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_sponsor_analytics_product_id ON public.sponsor_analytics(product_id);
CREATE INDEX idx_sponsor_analytics_created_at ON public.sponsor_analytics(created_at);

-- Enable RLS
ALTER TABLE public.sponsor_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for tracking)
CREATE POLICY "Anyone can insert sponsor analytics"
ON public.sponsor_analytics
FOR INSERT
WITH CHECK (true);

-- Product owners can view their sponsor analytics
CREATE POLICY "Product owners can view their sponsor analytics"
ON public.sponsor_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products
    WHERE products.id = sponsor_analytics.product_id
    AND products.owner_id = auth.uid()
  )
);

-- Admins can view all sponsor analytics
CREATE POLICY "Admins can view all sponsor analytics"
ON public.sponsor_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));