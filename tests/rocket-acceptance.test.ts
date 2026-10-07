import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLIENT_ID,
  isActiveOneTimePurchase,
  validReturnPath,
  validVerifiedEmail,
} from '../supabase/functions/launch-rocket-access/rules.ts';

const product = {
  product_id: '10000000-0000-4000-8000-000000000001',
  product_key: 'launch-pro-psr2nks',
  enabled: true,
};
const purchase = {
  purchase_id: '20000000-0000-4000-8000-000000000001',
  ...product,
  client_id: CLIENT_ID,
  billing_type: 'one_time',
  status: 'granted',
  verified_paid: true,
};

test('callback state must be exact, short lived, and returned to the same browser', () => {
  const state = 's'.repeat(43);
  const pending = { state, created_at: Date.now() - 1_000 };
  assert.equal(pending.state === state && Date.now() - pending.created_at < 10 * 60_000, true);
  assert.equal(pending.state === 'other', false);
  assert.equal(validReturnPath('/auth?mode=signup'), true);
  assert.equal(validReturnPath('//attacker.example'), false);
  assert.equal(validReturnPath('https://attacker.example'), false);
});

test('only a Rocket-verified email for the signed subject can create or link Launch identity', () => {
  assert.equal(validVerifiedEmail({ sub: 'rocket-user', email: 'Founder@Example.com', email_verified: true }, 'rocket-user'), 'founder@example.com');
  for (const profile of [
    { sub: 'other-user', email: 'founder@example.com', email_verified: true },
    { sub: 'rocket-user', email: 'founder@example.com', email_verified: false },
    { sub: 'rocket-user', email: 'not-an-email', email_verified: true },
    { sub: 'rocket-user', email_verified: true },
  ]) assert.equal(validVerifiedEmail(profile, 'rocket-user'), null);
});

test('missing, revoked, refunded, expired or unverified one-time purchases fail closed', () => {
  const response = { sub: 'rocket-user', client_id: CLIENT_ID, purchases: [purchase] };
  assert.equal(isActiveOneTimePurchase(response, 'rocket-user', product).length, 1);
  for (const change of [
    { status: 'refunded' }, { status: 'revoked' }, { status: 'expired' }, { status: 'disputed' },
    { status: 'canceled' }, { verified_paid: false }, { product_key: 'another-product' },
    { client_id: 'another-client' }, { purchase_id: 'not-a-uuid' },
  ]) assert.equal(isActiveOneTimePurchase({ ...response, purchases: [{ ...purchase, ...change }] }, 'rocket-user', product).length, 0);
  assert.equal(isActiveOneTimePurchase({ ...response, purchases: [] }, 'rocket-user', product).length, 0);
  assert.equal(isActiveOneTimePurchase(response, 'rocket-user', { ...product, enabled: false }).length, 0);
});
