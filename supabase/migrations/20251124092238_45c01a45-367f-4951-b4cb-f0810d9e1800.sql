-- One-time fix for product that failed to update after payment
UPDATE products 
SET 
  status = 'scheduled',
  launch_date = '2025-11-25 09:00:00+00'
WHERE 
  id = '87dcea12-052e-49d8-9361-8b22e2a92ed4' 
  AND status = 'draft';