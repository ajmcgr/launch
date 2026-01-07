-- Push live all non-skip plan scheduled products
UPDATE products 
SET status = 'launched', launch_date = NOW() 
WHERE status = 'scheduled' 
AND id NOT IN (
  SELECT product_id FROM orders WHERE plan = 'skip' AND product_id IS NOT NULL
)