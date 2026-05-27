# Founder Milestone System

Build an end-to-end milestone system that detects achievements, generates share cards, sends branded Resend emails, and surfaces them in founder analytics + public profiles.

## 1. Database (migration)

New table `product_achievements`:
- `id` uuid pk
- `product_id` uuid → products
- `founder_id` uuid → auth.users (product owner at time of award)
- `achievement_type` text (enum-like: `trending_1`, `trending_top_10`, `featured`, `most_saved`, `clicks_100`, `clicks_500`, `clicks_1000`, `clicks_5000`, `impressions_10000`, `fastest_rising`, `popular_week`, `collections_100`, `homepage_trending`)
- `metric_value` numeric
- `metric_label` text (e.g. "1,247 clicks")
- `achieved_at` timestamptz default now()
- `email_status` text default 'pending' (`pending` | `sent` | `failed` | `skipped`)
- `email_sent_at` timestamptz
- `share_count` int default 0
- `metadata` jsonb
- UNIQUE(`product_id`, `achievement_type`) — one-time per product per type

RLS:
- Public SELECT (achievements are public reputation)
- Founders can UPDATE own (for share_count increment via RPC)
- Service role full access (edge fn writes)

GRANTs: anon SELECT, authenticated SELECT+UPDATE(own), service_role ALL.

Index: `(founder_id, achieved_at desc)`, `(product_id, achieved_at desc)`.

## 2. Detection edge function: `detect-milestones`

Deployed manually per project convention. Scheduled via existing pg_cron (hourly).

Logic per active product:
- Query `product_vote_counts`, `product_analytics` (clicks/impressions), `user_collection_items` counts, leaderboard rank.
- For each milestone type not yet in `product_achievements` for that product, evaluate threshold:
  - `clicks_*` → cumulative outbound clicks from `/go/:slug` analytics
  - `impressions_10000` → product page views
  - `collections_100` → count of user_collection_items where product_id = X
  - `trending_1` / `trending_top_10` / `homepage_trending` → today's rank ≤ 1 / ≤ 10
  - `most_saved` → top 1 by saves in last 7 days
  - `featured` → has `featured = true` flag
  - `fastest_rising` → biggest vote delta in 24h (top 1)
  - `popular_week` → top 5 by votes this week
- INSERT achievement (ON CONFLICT DO NOTHING)
- For each newly inserted row → invoke `send-milestone-email`

## 3. Email: reuse existing Resend system (send-transactional-email pattern already used in project, per memory `auth/resend-integration`)

New template `milestone-achievement.tsx` (React Email) under `_shared/transactional-email-templates/`:
- Product logo, achievement title, key metric, stats snapshot
- Buttons: "View Analytics" (/dashboard/analytics?product=…), "View Product", "Share Achievement"
- Subject function based on achievement_type (emoji + dynamic)
- Celebratory tone, brand colors

Triggered from `detect-milestones` via `supabase.functions.invoke('send-transactional-email', {...})` with `idempotencyKey: milestone-${achievement.id}`. Update `email_status` after.

## 4. Share Card component (frontend)

`src/components/MilestoneShareCard.tsx`:
- Visual card (rendered with html2canvas for PNG download)
- Product logo, name, achievement title, metric, "Launch" branding, optional founder avatar
- Actions: Share on X, LinkedIn, Copy Link, Download PNG
- Pre-written share text per achievement type
- Share URL: `/achievement/:id` (new route showing OG card)

Optional: `og-share` edge fn already exists per memory — extend to handle `?achievement=ID` to render OG meta.

## 5. Founder Analytics integration

In existing analytics dashboard (find via grep, likely `src/pages/Dashboard*` or `FounderAnalytics`):
- New "Achievements" section listing earned milestones for founder's products
- Columns: icon, title, product, metric, date, email status badge, Share button (opens MilestoneShareCard modal)

## 6. Public Profile integration

In `src/pages/UserProfile.tsx`:
- New "Achievements" section (replace/augment existing achievements grid) pulling from `product_achievements` joined to products
- Badge-style display grouped by type (Trending, Clicks, Featured, Saves)
- Click → opens share card

## 7. Files to create / edit

Create:
- Migration: add `product_achievements` table + RLS + grants + indexes
- `supabase/functions/detect-milestones/index.ts`
- `supabase/functions/_shared/transactional-email-templates/milestone-achievement.tsx`
- Update `_shared/transactional-email-templates/registry.ts`
- `src/components/MilestoneShareCard.tsx`
- `src/components/MilestoneShareModal.tsx`
- `src/components/FounderAchievements.tsx` (used in dashboard + profile)
- `src/pages/AchievementShare.tsx` (route `/achievement/:id`)
- `src/lib/milestones.ts` (titles, share text, thresholds, icons)

Edit:
- `src/App.tsx` — add `/achievement/:id` route
- Founder analytics page — add Achievements section
- `src/pages/UserProfile.tsx` — wire real achievements from DB

## 8. Deployment notes

- `detect-milestones` deployed manually via Supabase dashboard (per memory rule)
- Email template uses string-concat HTML if needed (per memory rule on edge fn templating) — but transactional template registry uses React Email (.tsx) which is the standard pattern — follow that since existing templates do.
- Cron job (manual SQL): `select cron.schedule('detect-milestones-hourly','0 * * * *', $$ select net.http_post(...) $$);` — user can run after deploy.

## Out of scope (future)

- share_count tracking via redirect
- Per-user notification feed
- Animated/video share cards