-- Add winner tracking columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS won_daily BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS won_weekly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS won_monthly BOOLEAN DEFAULT false;

-- Add comment explaining the columns
COMMENT ON COLUMN products.won_daily IS 'True if product was top product of the day';
COMMENT ON COLUMN products.won_weekly IS 'True if product was top product of the week';
COMMENT ON COLUMN products.won_monthly IS 'True if product was top product of the month';