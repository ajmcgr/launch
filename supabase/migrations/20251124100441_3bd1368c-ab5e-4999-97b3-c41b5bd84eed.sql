-- Insert missing maker record for Write product
INSERT INTO product_makers (product_id, user_id)
SELECT p.id, p.owner_id
FROM products p
WHERE p.slug = 'write' 
  AND NOT EXISTS (
    SELECT 1 FROM product_makers pm WHERE pm.product_id = p.id AND pm.user_id = p.owner_id
  );

-- Create function to automatically add product owner as maker
CREATE OR REPLACE FUNCTION add_owner_as_maker()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_makers (product_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after product insert
DROP TRIGGER IF EXISTS after_product_insert_add_maker ON products;
CREATE TRIGGER after_product_insert_add_maker
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_maker();