-- Add 15 votes for AdGenerator product to make it #1
INSERT INTO votes (product_id, user_id, value)
SELECT 'de1af16e-71f4-40f7-83a5-b30b65fa276c', u.id, 1
FROM users u
WHERE u.id NOT IN (
  SELECT user_id FROM votes WHERE product_id = 'de1af16e-71f4-40f7-83a5-b30b65fa276c'
)
LIMIT 15
ON CONFLICT DO NOTHING;