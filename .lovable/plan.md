# Community Launches & Founder Claiming

A unified system that lets community members submit products they didn't build, and lets founders claim those listings to convert them into Founder Launches.

## 1. Database changes

New migration adding:

- `products.submission_type` — enum-like text, `'founder' | 'community'`, default `'founder'` (backfill existing rows to `'founder'`)
- `products.submitted_by_user_id` — uuid, references `auth.users(id)`, nullable (backfill from `owner_id` for existing rows)
- `products.claimed_at` — timestamptz, nullable
- `products.original_submitter_id` — uuid, preserved attribution after claim
- New table `product_claims`:
  - `id`, `product_id`, `claimant_user_id`, `verification_method` (`email_domain` | `verified_founder` | `admin`), `verification_email`, `status` (`pending` | `approved` | `rejected`), `created_at`, `reviewed_at`, `reviewed_by`
  - RLS: claimant can insert/select own; admin can manage all
- New table `product_reports` for community-launch spam reporting:
  - `id`, `product_id`, `reporter_user_id`, `reason`, `details`, `status`, `created_at`
- Indexes on `submission_type`, `submitted_by_user_id`

GRANTs + RLS policies for all new tables (per project conventions).

## 2. Submission flow

`src/pages/Submit.tsx` — add a required first step before the existing form:

- Two large selectable cards: **🚀 Founder Launch** vs **🌎 Community Launch**
- Stored in form state as `submissionType`
- Submit insert includes `submission_type` and `submitted_by_user_id = auth.uid()`
- Community Launches: `owner_id` left null (or set to submitter for now; un-claimed)
- Light copy change on form fields when community is selected ("This product's name/URL", not "your product")

## 3. Feed & cards

Keep single feed (no fragmentation). Add subtle badge:

- New component `SubmissionTypeBadge.tsx` — tiny pill (🚀 Founder / 🌎 Community)
- Render in `LaunchCard`, `LaunchListItem`, `HomeLaunchCard`, `HomeLaunchListItem`, `CompactLaunchListItem` near the title
- Pass `submission_type` through existing product fetch shapes (update relevant `select` queries)

## 4. Product detail page

`src/pages/LaunchDetail.tsx`:

- Below product title: attribution block
  - Founder: "🚀 Founder Launch — Submitted by @maker"
  - Community: "🌎 Community Launch — Submitted by @submitter"
  - After claim: "Originally submitted by @x · Claimed by @founder on {date}"
- If `submission_type === 'community'` and unclaimed: **Claim This Product** CTA button → opens `ClaimProductModal`

## 5. Claim modal & verification

New `src/components/ClaimProductModal.tsx`:

- Three paths:
  1. **Verify via company email** — input email, must match product's domain root (e.g. `acme.com`). Sends a 6-digit code via new edge function `send-claim-verification`. User enters code to auto-approve claim → instantly converts to Founder Launch.
  2. **Already a verified founder** — if user owns another launched product with matching domain or has `verified_founder` flag, one-click claim auto-approves.
  3. **Request admin review** — opens form with explanation, inserts `product_claims` row with `status='pending'`.

New edge functions:

- `send-claim-verification` — generates code, stores hashed in `product_claims`, sends via Resend
- `verify-claim-code` — checks code, on success: updates `products` (`submission_type='founder'`, `owner_id=claimant`, `claimed_at=now()`, preserves `original_submitter_id`), inserts maker row, marks claim approved
- Both deployed manually per project convention

## 6. Founder notification email

New edge function `notify-founder-of-community-launch`:

- Triggered after community submission insert (call from `Submit.tsx`)
- Attempts to find founder email: try `contact@`, `hello@`, `founders@`, `team@` at product domain
- Sends Resend email with subject "Your product was discovered on Launch" + Claim CTA linking to product page with `?claim=true` to auto-open modal
- Logs attempt to a `founder_outreach_log` table to avoid duplicates

## 7. Profiles

`src/pages/UserProfile.tsx`:

- Add stats row: Founder Launches | Community Launches | Collections | Saves | Achievements
- Two separate sections (tabs or stacked): "Founder Launches" and "Community Launches"
- Query products by `owner_id` (founder) vs `submitted_by_user_id` where `submission_type='community'`
- For community submissions, aggregate total views/clicks/saves across their submissions → "Community Contributor" stats card

## 8. Achievements

Extend `FounderAchievements` logic / `product_achievements` system:

- `first_community_launch`, `top_community_contributor`, `most_saved_community_launch`, `community_launch_of_week`, `product_claimed_by_founder`
- Granted via existing achievement detection patterns (DB triggers or `detect-winners`-style cron)

## 9. Anti-spam

- Duplicate detection: before insert, check existing product with same normalized domain → block with "This product already exists, here it is: …"
- Submission limit: max 3 community launches per user per 24h (client-side check + DB count guard)
- Report button on product detail (community launches only) → inserts `product_reports`
- Admin moderation panel: new tab in `src/pages/Admin.tsx` listing pending reports + pending claims, with approve/reject actions

## 10. Ranking

No changes — existing ranking applies to both types uniformly.

---

## Technical notes

- All new product fields propagated through fetch helpers; default `submission_type='founder'` keeps existing UI working without breakage
- Domain matching helper in `src/lib/domain.ts`: extracts registrable domain (handle subdomains)
- Use existing Resend pattern in edge functions (no new infra)
- All SQL operates in one migration file `database-community-launches.sql` with GRANTs + RLS

## Out of scope (for this pass)

- Stripe/paid tier integration for claims (claims free)
- Bulk founder claim flows for portfolio companies
- Public contributor leaderboard page (stats only on profile)

---

This is a large multi-area change. Confirm and I'll implement.