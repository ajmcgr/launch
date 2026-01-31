-- Recreate the notification triggers to ensure they're working properly

-- First, drop and recreate the handle_new_vote function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_vote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the vote insert
  RAISE WARNING 'handle_new_vote error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_new_vote ON votes;
CREATE TRIGGER on_new_vote
  AFTER INSERT ON votes
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_vote();

-- Also recreate the comment trigger
CREATE OR REPLACE FUNCTION public.handle_new_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_comment error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_new_comment ON comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment();

-- Recreate product follow trigger
CREATE OR REPLACE FUNCTION public.handle_new_product_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_product_follow error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_new_product_follow ON product_follows;
CREATE TRIGGER on_new_product_follow
  AFTER INSERT ON product_follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_product_follow();

-- Recreate user follow trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user_follow error: %', SQLERRM;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_new_user_follow ON follows;
CREATE TRIGGER on_new_user_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_follow();