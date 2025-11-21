-- Revert Product 2 back to draft status and remove the order
UPDATE products 
SET status = 'draft', 
    launch_date = NULL
WHERE id = '5129b336-2634-4ec2-8202-5e84b0aa602f';

-- Delete the manual order I created by mistake
DELETE FROM orders 
WHERE id = 'a36624e7-a80e-4e53-ad3f-f8a509903822';