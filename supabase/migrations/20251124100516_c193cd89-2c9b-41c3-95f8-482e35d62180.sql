-- Fix security: Set search_path for add_owner_as_maker function
CREATE OR REPLACE FUNCTION add_owner_as_maker()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_makers (product_id, user_id)
  VALUES (NEW.id, NEW.owner_id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;