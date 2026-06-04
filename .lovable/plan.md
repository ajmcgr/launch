# Founder vs Community Launches — Claim Flow

Distinguish who submitted each product, and let real founders verify ownership via email-domain match.

## Data model (new migration)

Add to `public.products`:
- `submission_source` text default `'community'` — `'founder' | 'community'`
- `claimed_at` timestamptz null
- `claimed_by` uuid null (references `auth.users(id)`)

New table `public.product_claim_requests`:
- `id`, `product_id`, `requested_by`, `email`, `token` (unique), `expires_at` (24h), `verified_at`, `created_at`
- RLS: users see/insert only their own rows; service_role full access

**No backfill.** Existing products keep `submission_source='community'`, `claimed_at=null`. They'll all show as "Community submitted" until claimed.

## Submission flow

On `/submit`, add a checkbox: *"I'm the founder / on the founding team."*
- Checked → `submission_source='founder'`, `claimed_by=owner_id`, `claimed_at=now()` (auto-claimed since they're authed and submitting)
- Unchecked → `submission_source='community'`, `claimed_at=null`

## Claim flow (for unclaimed products)

Product detail page shows **"Claim this launch"** CTA when `claimed_at IS NULL`.

1. User enters an email at the product's root domain (parsed from `domain_url`)
2. Edge function `request-product-claim`:
   - Validates email's domain matches product's domain
   - Generates token, stores claim request, sends Resend verification email
3. User clicks link → `/claim/verify?token=...` → edge function `verify-product-claim`:
   - Marks request verified
   - Sets `products.claimed_by = requesting user`, `claimed_at = now()`, `owner_id = requesting user`, `submission_source = 'founder'`

## UI badges

Small inline badge near product title on detail page (not in dense feed rows, per homepage aesthetic rules):
- `claimed_at` set → "By Founder" (subtle check icon)
- Otherwise → "Community submitted"

## Files

- New migration: `add_product_claim_columns_and_requests.sql`
- New edge functions: `supabase/functions/request-product-claim/index.ts`, `supabase/functions/verify-product-claim/index.ts`
- New route: `src/pages/ClaimVerify.tsx` (calls verify fn, shows status)
- New component: `src/components/ClaimLaunchDialog.tsx` (email input + submit)
- Edit: `src/pages/Submit.tsx` — add founder checkbox, write new fields
- Edit: `src/pages/ProductDetail.tsx` (and/or `ToolDetail.tsx`) — badge + Claim CTA
- Edit: `src/App.tsx` — register `/claim/verify` route

## Constraints respected

- Edge function HTML uses string concatenation (per memory)
- Functions deploy manually via Supabase dashboard (per memory)
- No tracking pixels; uses Resend for the verification email
- Founder claim email is transactional (not bulk), so it's allowed
- `max-w-7xl` layout, semantic tokens for badge colors

## Open detail (minor)

Domain match logic: I'll strip `www.`, accept any subdomain of the root (so `alex@mail.acme.com` works for `acme.com`). Public-email blocklist (gmail, yahoo, outlook, proton, icloud) → rejected with a clear error.

Ship?
