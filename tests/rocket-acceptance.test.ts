import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENT_ID, verifiedPurchases, isProOffer } from "../supabase/functions/launch-rocket-access/rules.ts";
import { validCallback } from "../src/lib/rocketCallback.ts";

const now = Date.parse("2026-10-06T00:00:00Z");
const config = { product_id: '10000000-0000-4000-8000-000000000001', product_key: 'test-fixture-not-production' };
const purchase = { purchase_id: '20000000-0000-4000-8000-000000000001', ...config, client_id: CLIENT_ID, billing_type: 'one_time', environment: 'production', quantity: 1, status: 'granted', verified_paid: true, amount_cents: 3900, currency: 'usd', application_fee_cents: 195 };
const response = { sub: 'buyer', client_id: CLIENT_ID, purchases: [purchase], entitlements: [] };
test('exact subject, client, canonical product, paid amount and fee required', () => {
  assert.equal(verifiedPurchases(response, 'buyer', config).length, 1);
  assert.equal(verifiedPurchases(response, 'other', config).length, 0);
  assert.equal(verifiedPurchases({ ...response, client_id: 'other' }, 'buyer', config).length, 0);
  assert.equal(verifiedPurchases(response, 'buyer', null).length, 0);
  for (const change of [{ product_id: 'other' }, { product_key: 'legacy' }, { client_id: 'other' }, { environment: 'test' }, { billing_type: 'subscription' }, { quantity: 2 }, { status: 'refunded' }, { status: 'disputed' }, { verified_paid: false }, { amount_cents: 100 }, { currency: 'eur' }, { application_fee_cents: 0 }, { purchase_id: 'invalid' }]) {
    assert.equal(verifiedPurchases({ ...response, purchases: [{ ...purchase, ...change }] }, 'buyer', config).length, 0);
  }
  assert.equal(verifiedPurchases({ ...response, purchases: [purchase, purchase] }, 'buyer', config).length, 0);
  assert.equal(verifiedPurchases({ ...response, purchases: [] }, 'buyer', config).length, 0);
});
test('public offer is the canonical $39 one-time product only', () => {
  const plan = { id: config.product_id, amount_cents: 3900, currency: 'usd', billing_type: 'one_time', interval: null };
  assert.equal(isProOffer(plan, config), true);
  for (const change of [{ id: 'other' }, { amount_cents: 100 }, { currency: 'eur' }, { billing_type: 'subscription' }, { interval: 'month' }]) assert.equal(isProOffer({ ...plan, ...change }, config), false);
  assert.equal(isProOffer(plan, null), false);
  assert.equal(isProOffer(null, config), false);
});
test("callback requires an exact unexpired state and valid nonce/verifier", () => {
  const pending = { state: "s".repeat(43), nonce: "n".repeat(43), verifier: "v".repeat(43), created_at: now - 1000 };
  assert.equal(validCallback(pending, pending.state, now), true);
  assert.equal(validCallback(pending, "wrong", now), false);
  assert.equal(validCallback(null, pending.state, now), false);
  assert.equal(validCallback(pending, null, now), false);
  assert.equal(validCallback({ ...pending, created_at: now - 600000 }, pending.state, now), false);
  assert.equal(validCallback({ ...pending, created_at: now + 1 }, pending.state, now), false);
  assert.equal(validCallback({ ...pending, nonce: "bad" }, pending.state, now), false);
});
