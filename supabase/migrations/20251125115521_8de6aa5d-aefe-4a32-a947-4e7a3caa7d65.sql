-- Enable Row Level Security on product_categories table
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create policy: Everyone can view categories (public read access)
CREATE POLICY "Anyone can view product categories" 
ON public.product_categories 
FOR SELECT 
USING (true);

-- Create policy: Only admins can insert categories
CREATE POLICY "Only admins can insert product categories" 
ON public.product_categories 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create policy: Only admins can update categories
CREATE POLICY "Only admins can update product categories" 
ON public.product_categories 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create policy: Only admins can delete categories
CREATE POLICY "Only admins can delete product categories" 
ON public.product_categories 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));