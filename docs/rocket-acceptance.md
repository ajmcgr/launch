# Launch production Rocket acceptance

This integration proves a **new Rocket-originated purchase** in a separate Launch acceptance area. It does not link Rocket identities to existing Launch users, update Launch user rows, grant a Launch Pass, import subscriptions, replace authentication, or call Launch's existing Stripe billing functions.

## Registered and deployed

- Rocket app: `b202d75a-02ae-46e6-8419-5b3410cbaac8` (Launch), existing domain-verified owner.
- Production public client: `rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn`.
- Exact callback: `https://trylaunch.ai/rocket/callback`.
- Acceptance page: `https://trylaunch.ai/rocket/acceptance`.
- Requested consent scopes: `openid profile entitlements:read`; email is not requested.
- Launch Supabase: `gzpypxgdkxdynovploxn`, separate custom-auth Edge Function `launch-rocket-access`.
- Rocket ES256 issuer/audience/expiry/nonce verification, live UserInfo and client-bound entitlements, PKCE S256 and single-use local state.
- Separate tab-scoped Rocket tokens. Callback credentials are removed before existing analytics scripts load. No server token storage or logging.
- Protected response checks the actual bearer token on every request. Only the exact configured product with one active/canceling, finite future entitlement grants this area's access.

Revenue verification remains Coming soon and is not involved in checkout or access.

## Financial-account takeover

Do not click Connect Stripe on the user's behalf: it creates a new live financial merchant account before redirecting to Stripe.

1. Open `https://tryrocket.ai/buy-with-rocket?app=b202d75a-02ae-46e6-8419-5b3410cbaac8` using Launch's existing verified Rocket owner.
2. Select Launch and enter the **actual legal business country** (two-letter code). Do not infer this from location or use the US placeholder blindly.
3. The user clicks **Connect Stripe** to create Launch's new Rocket Connect merchant.
4. In Stripe-hosted onboarding, the user supplies the appropriate legal entity, tax/business information, representative/beneficial-owner verification, payout bank details, and accepts Stripe's applicable agreements. Country-specific fields and any identity checks are determined by Stripe.
5. Return to Rocket. Require card payments and payouts to be active before creating a plan. Resolve any outstanding Stripe requirements through the user's takeover.

The existing Launch Stripe organization account and its customers/subscriptions must not be disconnected or migrated. Rocket's Connect platform is distinct from the new connected merchant.

## Prepared plan and gates (not yet created)

Plan name: **Launch — Rocket acceptance**. Amount: **100 cents USD**, recurring **monthly**, no trial or coupon. Platform fee currently **500 basis points (5%)**. Create it inactive after merchant readiness; record the returned plan ID and product key.

Set these nonsecret Launch function configuration values to the exact returned identifiers, never a guessed key:

```
LAUNCH_ROCKET_ACCEPTANCE_PLAN_ID=<new Launch connect_products.id>
LAUNCH_ROCKET_ACCEPTANCE_PRODUCT_KEY=<new Launch connect_products.product_key>
```

Without both identifiers the Launch acceptance flow denies access and hides Buy. Rocket also requires its global live checkout gate, isolated Connect webhook secret, current verified ownership, production client, ready live merchant, one activated plan, exact Stripe price and `integration_confirmed_at`.

As inspected, Rocket has **no supported operation that records `integration_confirmed_at`**. Do not fabricate this proof with a blind SQL update. Implement/approve an auditable readiness-confirmation step and validate the actual production callback/denial paths before activation. The global gate must stay off while this remains unresolved. Never enable public checkout merely to bypass a readiness check.

## Proposed live transaction — approval required

- A separate controlled Rocket buyer (not Launch's owner; Rocket forbids buying one's own app), with no Launch acceptance entitlement or existing purchase.
- Buy exactly one new **Launch — Rocket acceptance**, **$1 USD/month**, from Launch's Rocket app profile. The approval must cover the monthly recurrence until cancellation, any displayed tax, and the selected payment method. Stop if total differs from the approved amount.
- Proposed first charge is **$1.00 USD total**, with no extra tax/fee assumption. Checkout must confirm that exact total before the user pays. At 5%, Rocket's application fee would be **$0.05**; Stripe processing/payout fees depend on merchant and payment method and reduce merchant proceeds.
- No existing Launch Stripe customer/subscription is reused or modified. No legacy Pass entitlement can satisfy the acceptance check.
- Before payment: new buyer signs in with Rocket and acceptance resource returns denied.
- User explicitly approves and performs the live payment. Record the new Checkout Session, invoice, subscription, connected merchant, buyer, Launch client/product and Rocket transaction IDs without exposing card data.
- Require actual live Connect webhook processing, a new paid Rocket transaction/entitlement, purchase in Rocket Library, and a server-authorized acceptance response for the same buyer/client/product. A mocked positive test does not count as live proof.
- Refresh, separate login/session and a second buyer must not inherit access. Revoked/expired/mismatched access must fail closed.
- After separate approval, cancel only this new acceptance subscription at period end to prevent a second monthly charge. Never cancel existing Launch subscriptions. Disable new acceptance sales after the controlled run. Preserve the purchased period until its actual expiry; test eventual denial without shortening unrelated access.

## Validation

Use Node 22.18+ or newer for TypeScript test stripping, then `npm ci`, `npm run test:rocket`, `npm run typecheck:rocket`, `npm run build`.

Tests cover wrong buyer/client/product, inactive/revoked/expired/malformed/duplicate entitlements, exact $1 monthly offer, expired/mismatched state, valid signature with no purchase, invalid signature/issuer/audience/expiry/claims, current access-token revocation and identity mismatch. Browser verification rejects a forged callback and strips its query. Deployed denial probes must return 401 for unauthenticated status/protected requests and an unavailable offer until configured.

Production positive consent and purchase proof are pending; do not claim them from unit tests or config registration.
