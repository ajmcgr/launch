-- Add unique constraint to product_archives to support upsert operations
ALTER TABLE product_archives 
ADD CONSTRAINT product_archives_year_period_product_unique 
UNIQUE (year, period, product_id);