import { test } from "node:test";
import assert from "node:assert/strict";
import { CLIENT_ID, hasAcceptanceAccess, isAcceptanceOffer } from "../supabase/functions/launch-rocket-access/rules.ts";
import { validCallback } from "../src/lib/rocketCallback.ts";

const now = Date.parse("2026-10-06T00:00:00Z");
const entitlement = { product_key: "acceptance", status: "active", active: true, valid_until: "2026-11-06T00:00:00Z" };
const response = { sub: "buyer", client_id: CLIENT_ID, entitlements: [entitlement] };
test("only the exact buyer, client and configured product grant acceptance access", () => {
  assert.equal(hasAcceptanceAccess(response, "buyer", "acceptance", now), true);
  assert.equal(hasAcceptanceAccess(response, "other", "acceptance", now), false);
  assert.equal(hasAcceptanceAccess({ ...response, client_id: "another-app" }, "buyer", "acceptance", now), false);
  assert.equal(hasAcceptanceAccess(response, "buyer", "other-product", now), false);
  assert.equal(hasAcceptanceAccess(response, "buyer", undefined, now), false);
  assert.equal(hasAcceptanceAccess({ ...response, entitlements: [] }, "buyer", "acceptance", now), false);
});
test("revoked, inactive, expired, missing, malformed and duplicate entitlements deny access", () => {
  for (const change of [{ status: "revoked" }, { active: false }, { valid_until: null }, { valid_until: "invalid" }, { valid_until: "2026-10-06T00:00:00Z" }, { valid_until: "2026-09-01T00:00:00Z" }]) {
    assert.equal(hasAcceptanceAccess({ ...response, entitlements: [{ ...entitlement, ...change }] }, "buyer", "acceptance", now), false);
  }
  assert.equal(hasAcceptanceAccess({ ...response, entitlements: [entitlement, entitlement] }, "buyer", "acceptance", now), false);
  assert.equal(hasAcceptanceAccess({ ...response, entitlements: [{ ...entitlement, status: "canceling" }] }, "buyer", "acceptance", now), true);
});
test("public offer needs the specific live $1 USD monthly acceptance plan", () => {
  const plan = { id: "plan", amount_cents: 100, currency: "usd", interval: "month" };
  assert.equal(isAcceptanceOffer(plan, "plan"), true);
  for (const change of [{ id: "other" }, { amount_cents: 9900 }, { currency: "eur" }, { interval: "year" }]) assert.equal(isAcceptanceOffer({ ...plan, ...change }, "plan"), false);
  assert.equal(isAcceptanceOffer(plan, undefined), false);
  assert.equal(isAcceptanceOffer(null, "plan"), false);
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
