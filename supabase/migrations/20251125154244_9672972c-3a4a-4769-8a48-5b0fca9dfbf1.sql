-- Create table for archived product data
CREATE TABLE IF NOT EXISTS public.product_archives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', 'week', 'month', 'year')),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  net_votes INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(year, period, product_id)
);

-- Enable RLS
ALTER TABLE public.product_archives ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view archives
CREATE POLICY "Archives are viewable by everyone" 
ON public.product_archives 
FOR SELECT 
USING (true);

-- Only admins can manage archives
CREATE POLICY "Only admins can manage archives" 
ON public.product_archives 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_product_archives_year_period ON public.product_archives(year, period);
CREATE INDEX idx_product_archives_product_id ON public.product_archives(product_id);

COMMENT ON TABLE public.product_archives IS 'Stores archived top products data for each year and period';
COMMENT ON COLUMN public.product_archives.year IS 'The year this archive belongs to';
COMMENT ON COLUMN public.product_archives.period IS 'The time period: today, week, month, year';
COMMENT ON COLUMN public.product_archives.rank IS 'The rank of the product in this period (1-100)';
COMMENT ON COLUMN public.product_archives.net_votes IS 'The net votes at the time of archiving';