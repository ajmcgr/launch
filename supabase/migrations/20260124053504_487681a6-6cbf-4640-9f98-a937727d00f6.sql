-- Set AdGenerator as permanent sponsored product (position 1, forever)
UPDATE sponsored_products 
SET end_date = '2099-12-31'::date
WHERE product_id = 'de1af16e-71f4-40f7-83a5-b30b65fa276c';