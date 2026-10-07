# Rocket Launch Pro V1

Additional commerce channel only. Existing Launch authentication, Stripe checkout,
subscriptions, free submissions and scheduling remain unchanged.

Launch's existing paid Pro model is `orders.plan = 'skip'` attached to an owned
Launch `products` draft. A verified Rocket purchase creates exactly one such
order. The existing Submit flow schedules that paid draft without another charge.
`stripe_session_id = rocket_purchase:<UUID>` is an external reference (as with
existing Launch Pass references), not a claimed Stripe Checkout session.

Rocket OAuth uses the existing production client, S256 PKCE, state, nonce, JWKS,
issuer/audience validation and current opaque-token/authorization checks. Scopes
remain `openid profile entitlements:read`. Linking explicitly requires both a
verified existing Launch session and Rocket identity, never matching by email.
No new Launch auth system is created. Revocation prevents further Rocket reads;
the linked stable subject and financial order persist for reauthorization.

The service-only canonical configuration is initially empty. Populate it only
with the real newly registered Launch Pro UUID/key, never the inactive monthly
product or a fixture. Rocket's current paid purchase must match that configuration,
the exact client, production mode, one_time, quantity 1, $39 USD and $1.95 fee.
Return URL `https://trylaunch.ai/my-products?success=true` is navigation only.

The database RPC is service-only and checks explicit account linking, canonical
product, listing ownership and draft state. Purchase IDs are globally unique on
orders; concurrent retries lock by purchase ID and return the same order. Binding
fields are immutable. Ordinary browser writes cannot manufacture Rocket orders.

Refund V1: Rocket stops reporting refunded/disputed purchases as verified paid.
Launch denies new fulfilment for them. A previously fulfilled order is retained;
no second order, destructive revocation or deletion of consumed service occurs.
No refund-status change or redirect can grant another unit.

Official hosted Rocket buttons are used. The additional pricing option is hidden
unless Rocket's server catalog passes the existing public gate and canonical
one-time contract. This work does not enable public checkout or make a charge.

The existing private acceptance endpoint is now $39 one-time only, never monthly.
Its new switches `LAUNCH_PRO_ACCEPTANCE_ENABLED`, `LAUNCH_PRO_ACCEPTANCE_PLAN_ID`,
and `LAUNCH_PRO_ACCEPTANCE_BUYER_USER_ID` must remain unset until explicit live
purchase approval and the independent buyer prechecks. Old $1 pilot settings
cannot enable it. It uses existing Checkout attempts, merchant isolation and
webhook purchase grants while the public gate remains closed. Its proof action
requires a natural paid live Checkout, the corresponding webhook-created grant,
and exactly one existing Launch order, not a redirect or operator attestation.

Still required before real-money authorization: authorized Stripe browser access
to prove merchant requirements and processing treatment, real canonical product
registration/configuration, production frontend publication, and independent
buyer natural OAuth/session/pre-purchase checks. Never infer these from SQL fixtures.
