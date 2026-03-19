-- ============================================================
-- Seed product_outcomes with realistic fake data
-- Run this in the Supabase SQL Editor
-- Picks 10 random launched products and inserts outcomes
-- ============================================================

WITH random_products AS (
  SELECT id, name, slug
  FROM products
  WHERE status = 'launched'
  ORDER BY random()
  LIMIT 10
),
fake_outcomes AS (
  SELECT
    id AS product_id,
    name,
    slug,
    ROW_NUMBER() OVER (ORDER BY random()) AS rn
  FROM random_products
)
INSERT INTO product_outcomes (product_id, signups, revenue, testimonial, updated_at)
SELECT
  product_id,
  -- Vary signups: some high, some modest
  CASE
    WHEN rn = 1 THEN 847
    WHEN rn = 2 THEN 312
    WHEN rn = 3 THEN 1240
    WHEN rn = 4 THEN 56
    WHEN rn = 5 THEN 189
    WHEN rn = 6 THEN 425
    WHEN rn = 7 THEN 73
    WHEN rn = 8 THEN 2100
    WHEN rn = 9 THEN 94
    WHEN rn = 10 THEN 530
  END,
  -- Vary revenue: some zero, some significant
  CASE
    WHEN rn = 1 THEN 2400
    WHEN rn = 2 THEN 0
    WHEN rn = 3 THEN 8900
    WHEN rn = 4 THEN 350
    WHEN rn = 5 THEN 1200
    WHEN rn = 6 THEN 0
    WHEN rn = 7 THEN 4500
    WHEN rn = 8 THEN 15000
    WHEN rn = 9 THEN 0
    WHEN rn = 10 THEN 3200
  END,
  -- Vary testimonials: some null, most with quotes
  CASE
    WHEN rn = 1 THEN 'We got our first 100 signups within 48 hours of launching on Launch. The community feedback was incredibly valuable for shaping our roadmap.'
    WHEN rn = 2 THEN 'Launch gave us exactly the audience we needed — technical builders who actually use the tools they discover. Great quality traffic.'
    WHEN rn = 3 THEN 'The trackable link made it easy to attribute signups directly to Launch. We saw a 12% conversion rate from visitors to signups.'
    WHEN rn = 4 THEN NULL
    WHEN rn = 5 THEN 'Launching here connected us with early adopters who gave honest, actionable feedback. Two of them became paying customers within a week.'
    WHEN rn = 6 THEN 'The exposure from Launch helped us validate our idea fast. We pivoted based on community feedback and it was the best decision we made.'
    WHEN rn = 7 THEN 'Small but mighty community. Every signup we got from Launch had 3x the retention of our other channels.'
    WHEN rn = 8 THEN 'This was our most successful launch channel by far. The combination of visibility and engaged builders drove real, measurable results.'
    WHEN rn = 9 THEN NULL
    WHEN rn = 10 THEN 'We landed our first enterprise lead through Launch. Someone from a Series B startup discovered us and reached out the same day.'
  END,
  -- Stagger updated_at over the last 30 days for variety
  NOW() - (rn * INTERVAL '3 days')
FROM fake_outcomes
ON CONFLICT (product_id) DO UPDATE SET
  signups = EXCLUDED.signups,
  revenue = EXCLUDED.revenue,
  testimonial = EXCLUDED.testimonial,
  updated_at = EXCLUDED.updated_at;

-- Verify what was inserted
SELECT
  po.product_id,
  p.name,
  p.slug,
  po.signups,
  po.revenue,
  po.testimonial,
  po.updated_at
FROM product_outcomes po
JOIN products p ON p.id = po.product_id
ORDER BY po.updated_at DESC;
