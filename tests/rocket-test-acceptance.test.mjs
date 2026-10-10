import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/launch-rocket-test-access/rules.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { verifiedTestPurchases } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const subject = '10000000-0000-4000-8000-000000000001';
const clientId = 'rocket-dev-test-client';
const productId = '20000000-0000-4000-8000-000000000002';
const purchaseId = '30000000-0000-4000-8000-000000000003';
const config = { enabled: true, client_id: clientId, product_id: productId, product_key: 'launch-pro-test' };
const paid = {
  purchase_id: purchaseId, client_id: clientId, product_id: productId, product_key: config.product_key,
  environment: 'test', billing_type: 'one_time', status: 'granted', verified_paid: true,
  amount_cents: 3900, application_fee_cents: 195, currency: 'usd', quantity: 1,
};
const response = (purchase = paid) => ({ sub: subject, client_id: clientId, purchases: [purchase] });

test('only the exact paid $39 test purchase with a $1.95 Rocket fee can be fulfilled', () => {
  assert.deepEqual(verifiedTestPurchases(response(), subject, config), [{ purchase_id: purchaseId }]);
  for (const change of [
    { verified_paid: false }, { environment: 'production' }, { product_id: '40000000-0000-4000-8000-000000000004' },
    { client_id: 'other' }, { amount_cents: 3901 }, { application_fee_cents: 194 }, { billing_type: 'subscription' },
    { status: 'revoked' }, { refunded: true }, { disputed: true }, { canceled: true },
    { valid_until: new Date(Date.now() - 1000).toISOString() },
  ]) {
    assert.deepEqual(verifiedTestPurchases(response({ ...paid, ...change }), subject, config), [], JSON.stringify(change));
  }
  assert.deepEqual(verifiedTestPurchases(response(), 'other-subject', config), []);
  assert.deepEqual(verifiedTestPurchases(response(), subject, { ...config, enabled: false }), []);
  assert.deepEqual(verifiedTestPurchases({ ...response(), purchases: [paid, paid] }, subject, config), []);
});

test('test OAuth callback rejects a different state before reaching the server', async () => {
  const source = (await readFile(new URL('../src/lib/rocketTestAcceptance.ts', import.meta.url), 'utf8'))
    .replace("import { supabase } from '@/integrations/supabase/client';", 'export const supabase = {};');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const { completeRocketTest } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
  const storage = new Map([['launch:rocket:test:pending', JSON.stringify({ state: 's'.repeat(43), created_at: Date.now() })]]);
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const oldFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch');
  globalThis.sessionStorage = { getItem: key => storage.get(key), removeItem: key => storage.delete(key) };
  globalThis.fetch = () => assert.fail('callback mismatch must not contact Rocket or Launch');
  try {
    await assert.rejects(completeRocketTest(`?state=${'x'.repeat(43)}&code=code`), /not completed/);
    assert.equal(storage.has('launch:rocket:test:pending'), false);
  } finally {
    if (oldStorage) Object.defineProperty(globalThis, 'sessionStorage', oldStorage);
    else delete globalThis.sessionStorage;
    if (oldFetch) Object.defineProperty(globalThis, 'fetch', oldFetch);
    else delete globalThis.fetch;
  }
});
