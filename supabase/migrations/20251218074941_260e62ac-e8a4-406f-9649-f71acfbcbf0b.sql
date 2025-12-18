-- Create product_analytics table for tracking page views and clicks
CREATE TABLE public.product_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'page_view' or 'website_click'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  visitor_id text -- anonymous visitor identifier (optional)
);

-- Create indexes for efficient querying
CREATE INDEX idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX idx_product_analytics_event_type ON public.product_analytics(event_type);
CREATE INDEX idx_product_analytics_created_at ON public.product_analytics(created_at);

-- Enable RLS
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics (for tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.product_analytics
FOR INSERT
WITH CHECK (true);

-- Product owners can view their analytics
CREATE POLICY "Product owners can view their analytics"
ON public.product_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE products.id = product_analytics.product_id
    AND products.owner_id = auth.uid()
  )
);

-- Create a view for aggregated analytics per product
CREATE VIEW public.product_analytics_summary AS
SELECT 
  product_id,
  COUNT(*) FILTER (WHERE event_type = 'page_view') as total_page_views,
  COUNT(*) FILTER (WHERE event_type = 'website_click') as total_website_clicks
FROM public.product_analytics
GROUP BY product_id;