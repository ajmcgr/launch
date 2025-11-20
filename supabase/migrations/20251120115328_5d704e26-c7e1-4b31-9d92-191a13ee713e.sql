-- Fix handle_new_user function to handle duplicate usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base username from email or metadata
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1),
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Clean username (remove special chars, lowercase)
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  final_username := base_username;
  
  -- Try to insert with increasing counter if username exists
  LOOP
    BEGIN
      INSERT INTO public.users (id, username, avatar_url)
      VALUES (
        NEW.id,
        final_username,
        NEW.raw_user_meta_data->>'avatar_url'
      );
      EXIT; -- Success, exit loop
    EXCEPTION WHEN unique_violation THEN
      counter := counter + 1;
      final_username := base_username || '_' || counter;
      IF counter > 100 THEN
        -- Fallback to UUID-based username if too many collisions
        final_username := 'user_' || replace(NEW.id::text, '-', '');
        INSERT INTO public.users (id, username, avatar_url)
        VALUES (NEW.id, final_username, NEW.raw_user_meta_data->>'avatar_url');
        EXIT;
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$;