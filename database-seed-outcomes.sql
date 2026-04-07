-- ============================================================
-- Seed product_outcomes with realistic fake data
-- Run this in the Supabase SQL Editor
-- Picks 35 random launched products and inserts outcomes
-- ============================================================

WITH random_products AS (
  SELECT id, name, slug
  FROM products
  WHERE status = 'launched'
  ORDER BY random()
  LIMIT 35
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
    WHEN rn = 11 THEN 1580
    WHEN rn = 12 THEN 210
    WHEN rn = 13 THEN 45
    WHEN rn = 14 THEN 890
    WHEN rn = 15 THEN 367
    WHEN rn = 16 THEN 1920
    WHEN rn = 17 THEN 78
    WHEN rn = 18 THEN 640
    WHEN rn = 19 THEN 155
    WHEN rn = 20 THEN 3200
    WHEN rn = 21 THEN 410
    WHEN rn = 22 THEN 92
    WHEN rn = 23 THEN 1100
    WHEN rn = 24 THEN 275
    WHEN rn = 25 THEN 58
    WHEN rn = 26 THEN 730
    WHEN rn = 27 THEN 1450
    WHEN rn = 28 THEN 185
    WHEN rn = 29 THEN 520
    WHEN rn = 30 THEN 67
    WHEN rn = 31 THEN 2800
    WHEN rn = 32 THEN 340
    WHEN rn = 33 THEN 125
    WHEN rn = 34 THEN 960
    WHEN rn = 35 THEN 480
  END,
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
    WHEN rn = 11 THEN 7200
    WHEN rn = 12 THEN 980
    WHEN rn = 13 THEN 0
    WHEN rn = 14 THEN 5400
    WHEN rn = 15 THEN 1800
    WHEN rn = 16 THEN 12500
    WHEN rn = 17 THEN 0
    WHEN rn = 18 THEN 3600
    WHEN rn = 19 THEN 750
    WHEN rn = 20 THEN 28000
    WHEN rn = 21 THEN 2100
    WHEN rn = 22 THEN 0
    WHEN rn = 23 THEN 6800
    WHEN rn = 24 THEN 1500
    WHEN rn = 25 THEN 420
    WHEN rn = 26 THEN 0
    WHEN rn = 27 THEN 9200
    WHEN rn = 28 THEN 600
    WHEN rn = 29 THEN 2800
    WHEN rn = 30 THEN 0
    WHEN rn = 31 THEN 18500
    WHEN rn = 32 THEN 1400
    WHEN rn = 33 THEN 0
    WHEN rn = 34 THEN 4100
    WHEN rn = 35 THEN 2200
  END,
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
    WHEN rn = 11 THEN 'The quality of users from Launch is unmatched. These are builders who actually understand and use developer tools — not just window shoppers.'
    WHEN rn = 12 THEN 'Got featured in the weekly newsletter and saw a 40% spike in signups that week. The sustained visibility is what sets Launch apart.'
    WHEN rn = 13 THEN NULL
    WHEN rn = 14 THEN 'Our launch on Launch outperformed our Product Hunt launch in terms of actual conversions. The audience here is more action-oriented.'
    WHEN rn = 15 THEN 'Three of our first ten paying customers came directly from Launch. The ROI on the Pro plan was immediate and obvious.'
    WHEN rn = 16 THEN 'We went from zero to 1,900 signups in our first month, with Launch being our primary acquisition channel. Incredible platform for early-stage products.'
    WHEN rn = 17 THEN 'The community feedback alone was worth it. Got detailed bug reports and feature suggestions within hours of launching.'
    WHEN rn = 18 THEN 'Launch drove more qualified traffic than our paid ads. The visitors actually signed up and stuck around — our 30-day retention from Launch is 2x our average.'
    WHEN rn = 19 THEN NULL
    WHEN rn = 20 THEN 'Launched our API product here and got picked up by three different tech newsletters. The ripple effect from one good launch is massive.'
    WHEN rn = 21 THEN 'The SEO backlink from Launch still drives organic traffic months later. It''s the gift that keeps on giving for our domain authority.'
    WHEN rn = 22 THEN NULL
    WHEN rn = 23 THEN 'We used Launch to validate pricing. The direct feedback from makers who actually build products helped us find the right price point before scaling.'
    WHEN rn = 24 THEN 'First day on Launch: 50 signups, 3 paying users, and a partnership inquiry. Best launch day we''ve had on any platform.'
    WHEN rn = 25 THEN 'Even as a small launch, we got meaningful engagement. Every upvote came from someone who actually looked at our product.'
    WHEN rn = 26 THEN 'The community here is genuinely supportive. Got constructive feedback, not just empty upvotes. Helped us ship a better v2.'
    WHEN rn = 27 THEN 'Launch was the catalyst for our entire go-to-market. We built our initial user base here and used those testimonials to raise our seed round.'
    WHEN rn = 28 THEN 'Solid, targeted exposure. Our niche B2B tool found its first 10 customers through Launch — people who actually needed what we built.'
    WHEN rn = 29 THEN 'The analytics from the trackable link showed us exactly where our conversions were coming from. Data-driven launching at its best.'
    WHEN rn = 30 THEN NULL
    WHEN rn = 31 THEN 'We hit $18K in revenue within 60 days of launching, with 35% of that directly attributable to Launch traffic. Game-changing platform.'
    WHEN rn = 32 THEN 'Launch helped us break out of the echo chamber. Real users, real feedback, real traction — not just vanity metrics.'
    WHEN rn = 33 THEN 'Used Launch to soft-launch our beta. The early adopters we found here became our most engaged power users and product evangelists.'
    WHEN rn = 34 THEN 'The permanent listing means we keep getting discovered. Six months after launch, we still get 2-3 signups per week from our Launch page.'
    WHEN rn = 35 THEN 'Perfect platform for developer tools. The audience here gets it — no need to explain what an API is or why CI/CD matters.'
  END,
  NOW() - (rn * INTERVAL '2 days')
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
