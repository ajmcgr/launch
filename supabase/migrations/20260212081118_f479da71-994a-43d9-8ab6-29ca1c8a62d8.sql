
-- Create a materialized-style view that computes karma for each user
-- Karma formula:
--   +1 per upvote received on your products
--   +1 per comment you wrote
--   +1 per comment received on your products
--   +10 per daily win
--   +25 per weekly win
--   +50 per monthly win

CREATE OR REPLACE VIEW public.user_karma AS
SELECT 
  u.id AS user_id,
  u.username,
  u.avatar_url,
  u.name,
  COALESCE(upvotes_received.count, 0)
  + COALESCE(comments_written.count, 0)
  + COALESCE(comments_received.count, 0)
  + COALESCE(wins.points, 0) AS karma
FROM public.users u
LEFT JOIN (
  -- Upvotes received on user's products
  SELECT p.owner_id AS user_id, COUNT(*)::int AS count
  FROM public.votes v
  JOIN public.products p ON p.id = v.product_id
  WHERE v.value = 1 AND v.user_id != p.owner_id
  GROUP BY p.owner_id
) upvotes_received ON upvotes_received.user_id = u.id
LEFT JOIN (
  -- Comments written by user
  SELECT c.user_id, COUNT(*)::int AS count
  FROM public.comments c
  GROUP BY c.user_id
) comments_written ON comments_written.user_id = u.id
LEFT JOIN (
  -- Comments received on user's products (excluding self-comments)
  SELECT p.owner_id AS user_id, COUNT(*)::int AS count
  FROM public.comments c
  JOIN public.products p ON p.id = c.product_id
  WHERE c.user_id != p.owner_id
  GROUP BY p.owner_id
) comments_received ON comments_received.user_id = u.id
LEFT JOIN (
  -- Win points
  SELECT owner_id AS user_id,
    SUM(
      CASE WHEN won_daily = true THEN 10 ELSE 0 END
      + CASE WHEN won_weekly = true THEN 25 ELSE 0 END
      + CASE WHEN won_monthly = true THEN 50 ELSE 0 END
    )::int AS points
  FROM public.products
  GROUP BY owner_id
) wins ON wins.user_id = u.id;
