-- Auto-post @alex's first comment on every product launch.
-- Run this once in the Supabase SQL editor.
-- Catches every code path (free, paid, scheduled, future flows) via a DB trigger,
-- and backfills any already-launched products that are missing @alex's comment.

CREATE OR REPLACE FUNCTION public.auto_post_alex_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alex_id UUID := '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc';
  alex_exists BOOLEAN;
  already_commented BOOLEAN;
  comment_options TEXT[] := ARRAY[
    'Congrats on the launch! What inspired you to build this?',
    'Nice work — what''s next on the roadmap?',
    'Looks great! Curious, who''s the ideal user for this?',
    'Congrats! What was the hardest part of building it?',
    'Love the direction. How long did this take to put together?',
    'Awesome launch — what made you pick this problem to solve?',
    'Cool product! What''s the one feature you''re most proud of?',
    'Congrats on shipping! Any unexpected lessons along the way?',
    'Nice one — what''s the story behind the name?',
    'Looks promising. What''s the biggest challenge you''re tackling next?',
    'Congrats! Curious how you''re thinking about distribution?',
    'Great work. What would you do differently if you started over?',
    'Love this. Who''s it for and what makes it different?',
    'Congrats on launching! What''s been the best feedback so far?',
    'Nice launch — what tech stack did you build it on?',
    'Cool concept! How are you planning to grow from here?',
    'Congrats! What problem were you personally trying to solve?',
    'Looks solid. What''s the v2 going to look like?'
  ];
  chosen TEXT;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = alex_id) INTO alex_exists;
  IF NOT alex_exists THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.comments
    WHERE product_id = NEW.id AND user_id = alex_id
  ) INTO already_commented;
  IF already_commented THEN
    RETURN NEW;
  END IF;

  chosen := comment_options[1 + floor(random() * array_length(comment_options, 1))::int];

  INSERT INTO public.comments (product_id, user_id, content, parent_comment_id, pinned)
  VALUES (NEW.id, alex_id, chosen, NULL, false);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_post_alex_comment failed for product %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_post_alex_comment_insert ON public.products;
DROP TRIGGER IF EXISTS trg_auto_post_alex_comment_update ON public.products;

CREATE TRIGGER trg_auto_post_alex_comment_insert
AFTER INSERT ON public.products
FOR EACH ROW
WHEN (NEW.status = 'launched')
EXECUTE FUNCTION public.auto_post_alex_comment();

CREATE TRIGGER trg_auto_post_alex_comment_update
AFTER UPDATE OF status ON public.products
FOR EACH ROW
WHEN (NEW.status = 'launched' AND (OLD.status IS DISTINCT FROM 'launched'))
EXECUTE FUNCTION public.auto_post_alex_comment();

-- Backfill any already-launched products that don't have @alex's comment
INSERT INTO public.comments (product_id, user_id, content, parent_comment_id, pinned)
SELECT
  p.id,
  '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc'::uuid,
  (ARRAY[
    'Congrats on the launch! What inspired you to build this?',
    'Nice work — what''s next on the roadmap?',
    'Looks great! Curious, who''s the ideal user for this?',
    'Congrats! What was the hardest part of building it?',
    'Love the direction. How long did this take to put together?',
    'Awesome launch — what made you pick this problem to solve?',
    'Cool product! What''s the one feature you''re most proud of?',
    'Congrats on shipping! Any unexpected lessons along the way?',
    'Nice one — what''s the story behind the name?',
    'Looks promising. What''s the biggest challenge you''re tackling next?'
  ])[1 + floor(random() * 10)::int],
  NULL,
  false
FROM public.products p
WHERE p.status = 'launched'
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc')
  AND NOT EXISTS (
    SELECT 1 FROM public.comments c
    WHERE c.product_id = p.id
      AND c.user_id = '5a19e42c-f6df-4ae4-9ba0-caa7cf4359bc'
  );
