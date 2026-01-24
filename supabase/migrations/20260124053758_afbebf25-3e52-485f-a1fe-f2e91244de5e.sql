-- Remove the old Supalytics entries that conflict with AdGenerator at position 1
-- Keep AdGenerator as permanent position 1 sponsor
DELETE FROM sponsored_products 
WHERE product_id = 'e2f9fe32-ca2d-4d3c-be28-de3096146c4d' 
AND position = 1;