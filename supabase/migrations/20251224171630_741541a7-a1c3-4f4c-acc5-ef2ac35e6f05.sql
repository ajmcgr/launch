-- Add column to store the Stripe Product ID for filtering MRR
ALTER TABLE public.products 
ADD COLUMN stripe_product_id text;