-- Create trigger to automatically add product owner as maker
CREATE TRIGGER add_owner_as_maker_trigger
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_maker();

-- Fix the existing Bio product by adding the owner as maker
INSERT INTO product_makers (product_id, user_id) 
VALUES ('f33ba26c-bc63-4acd-9254-0a6ffd738f80', '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc')
ON CONFLICT DO NOTHING;