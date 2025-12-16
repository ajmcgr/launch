-- Add Stripe Connect fields to products table
ALTER TABLE public.products
ADD COLUMN stripe_connect_account_id text,
ADD COLUMN verified_mrr integer, -- stored in cents
ADD COLUMN mrr_verified_at timestamp with time zone;

-- Create index for sorting by revenue
CREATE INDEX idx_products_verified_mrr ON public.products(verified_mrr DESC NULLS LAST);

-- Add comment for clarity
COMMENT ON COLUMN public.products.verified_mrr IS 'Monthly Recurring Revenue in cents, verified via Stripe Connect';