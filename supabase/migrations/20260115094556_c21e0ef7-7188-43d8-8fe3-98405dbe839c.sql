-- Create a trigger function to auto-upvote new products
CREATE OR REPLACE FUNCTION public.auto_upvote_new_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a vote from the product owner when a new product is created
  INSERT INTO public.votes (product_id, user_id, value)
  VALUES (NEW.id, NEW.owner_id, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after product insert
CREATE TRIGGER auto_upvote_on_product_create
AFTER INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_upvote_new_product();