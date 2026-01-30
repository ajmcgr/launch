-- Function to create notification on new vote
CREATE OR REPLACE FUNCTION public.handle_new_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_owner_id uuid;
  product_name text;
  voter_username text;
BEGIN
  -- Only create notification for upvotes (value = 1)
  IF NEW.value != 1 THEN
    RETURN NEW;
  END IF;

  -- Get product owner and name
  SELECT owner_id, name INTO product_owner_id, product_name
  FROM products
  WHERE id = NEW.product_id;

  -- Don't notify if voting on own product
  IF product_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get voter username
  SELECT username INTO voter_username
  FROM users
  WHERE id = NEW.user_id;

  -- Check if owner has vote notifications enabled
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = product_owner_id 
    AND email_notifications_enabled = true 
    AND notify_on_vote = true
  ) THEN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, related_product_id)
    VALUES (
      product_owner_id,
      'new_vote',
      'New upvote on your product',
      '@' || voter_username || ' upvoted ' || product_name,
      NEW.product_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification on new comment
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_owner_id uuid;
  product_name text;
  commenter_username text;
BEGIN
  -- Get product owner and name
  SELECT owner_id, name INTO product_owner_id, product_name
  FROM products
  WHERE id = NEW.product_id;

  -- Don't notify if commenting on own product
  IF product_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter username
  SELECT username INTO commenter_username
  FROM users
  WHERE id = NEW.user_id;

  -- Check if owner has comment notifications enabled
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = product_owner_id 
    AND email_notifications_enabled = true 
    AND notify_on_comment = true
  ) THEN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, related_product_id)
    VALUES (
      product_owner_id,
      'new_comment',
      'New comment on your product',
      '@' || commenter_username || ' commented on ' || product_name,
      NEW.product_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification on new product follow
CREATE OR REPLACE FUNCTION public.handle_new_product_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_owner_id uuid;
  product_name text;
  follower_username text;
BEGIN
  -- Get product owner and name
  SELECT owner_id, name INTO product_owner_id, product_name
  FROM products
  WHERE id = NEW.product_id;

  -- Don't notify if following own product
  IF product_owner_id = NEW.follower_id THEN
    RETURN NEW;
  END IF;

  -- Get follower username
  SELECT username INTO follower_username
  FROM users
  WHERE id = NEW.follower_id;

  -- Check if owner has follow notifications enabled
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = product_owner_id 
    AND email_notifications_enabled = true 
    AND notify_on_follow = true
  ) THEN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, related_product_id)
    VALUES (
      product_owner_id,
      'new_follower',
      'New product follower',
      '@' || follower_username || ' is now following ' || product_name,
      NEW.product_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Function to create notification on new user follow
CREATE OR REPLACE FUNCTION public.handle_new_user_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_username text;
BEGIN
  -- Get follower username
  SELECT username INTO follower_username
  FROM users
  WHERE id = NEW.follower_id;

  -- Check if followed user has follow notifications enabled
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.followed_id 
    AND email_notifications_enabled = true 
    AND notify_on_follow = true
  ) THEN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, related_user_id)
    VALUES (
      NEW.followed_id,
      'new_follower',
      'New follower',
      '@' || follower_username || ' is now following you',
      NEW.follower_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_vote();

CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment();

CREATE TRIGGER on_new_product_follow
  AFTER INSERT ON product_follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_product_follow();

CREATE TRIGGER on_new_user_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_follow();