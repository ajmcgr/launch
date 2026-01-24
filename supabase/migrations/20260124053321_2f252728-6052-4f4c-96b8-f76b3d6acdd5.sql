-- Launch AdGenerator product
UPDATE products 
SET status = 'launched', launch_date = now() 
WHERE id = 'de1af16e-71f4-40f7-83a5-b30b65fa276c';

-- Add AdGenerator as sponsored product in position 1 for current month
INSERT INTO sponsored_products (product_id, position, sponsorship_type, start_date, end_date)
VALUES (
  'de1af16e-71f4-40f7-83a5-b30b65fa276c',
  1,
  'website',
  date_trunc('month', now())::date,
  (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date
);