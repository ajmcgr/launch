-- Manually process the payment for Product 2
-- Update product to launched status with launch date (8 days from now for 'join' plan)
UPDATE products 
SET status = 'launched', 
    launch_date = NOW() + INTERVAL '8 days'
WHERE id = '5129b336-2634-4ec2-8202-5e84b0aa602f';

-- Create order record for the payment
INSERT INTO orders (user_id, product_id, stripe_session_id, plan)
VALUES ('5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc', '5129b336-2634-4ec2-8202-5e84b0aa602f', 'manual_recovery_join_plan', 'join');

-- Ensure product maker relationship exists
INSERT INTO product_makers (product_id, user_id)
VALUES ('5129b336-2634-4ec2-8202-5e84b0aa602f', '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc')
ON CONFLICT DO NOTHING;