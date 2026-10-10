import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../supabase/functions/launch-rocket-access/rules.ts';

const source = await readFile(new URL('../supabase/functions/launch-rocket-access/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const productId = '10000000-0000-4000-8000-000000000001';
const purchaseId = '20000000-0000-4000-8000-000000000001';
const draftId = '30000000-0000-4000-8000-000000000001';
const product = { singleton: true, enabled: true, product_id: productId, product_key: 'launch-pro-psr2nks' };
const paid = { purchase_id: purchaseId, product_id: productId, product_key: product.product_key,
  client_id: rules.CLIENT_ID, billing_type: 'one_time', status: 'granted', verified_paid: true,
  environment: 'production', amount_cents: 3900, currency: 'usd', quantity: 1 };

async function harness({ enabled = true, owner = 'launch-user', purchase = paid, remoteFails = false } = {}) {
  const rawKey = new Uint8Array(32);
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const iv = new Uint8Array(12);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('server-only-token'));
  const encode = bytes => Buffer.from(bytes).toString('base64url');
  const rows = {
    rocket_pro_configuration: [{ ...product, enabled }],
    rocket_identities: [{ user_id: 'launch-user', rocket_subject: 'rocket-user', revoked_at: null,
      token_expires_at: new Date(Date.now() + 60000).toISOString(), access_token_ciphertext: `${encode(iv)}.${encode(ciphertext)}` }],
    products: [{ id: draftId, owner_id: owner, status: 'draft' }], orders: [],
  };
  const calls = [];
  const database = {
    auth: { getUser: async () => ({ data: { user: { id: 'launch-user' } }, error: null }) },
    from(table) {
      let selected = rows[table] || [];
      const query = {
        select: () => query, limit: () => query,
        not: (name, _operator, value) => { selected = selected.filter(row => row[name] !== value); return query; },
        eq: (name, value) => { selected = selected.filter(row => row[name] === value); return query; },
        single: async () => ({ data: selected[0] || null, error: null }),
        maybeSingle: async () => ({ data: selected[0] || null, error: null }),
        then: resolve => Promise.resolve({ data: selected, error: null }).then(resolve),
      };
      return query;
    },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: 'order-id', error: null }; },
  };
  let handler;
  const remoteCalls = [];
  vm.runInNewContext(compiled, {
    exports: {}, crypto, TextEncoder, TextDecoder, Uint8Array, URL, URLSearchParams, Response, AbortSignal, btoa, atob,
    Deno: { env: { get: name => name === 'ROCKET_AUTH_ENCRYPTION_KEY' ? encode(rawKey) : 'test' }, serve: fn => { handler = fn; } },
    require: name => name.includes('jose') ? { createRemoteJWKSet: () => ({}) } : name.includes('supabase-js') ? { createClient: () => database } : rules,
    fetch: async (url, options) => {
      remoteCalls.push({ url, body: options?.body ? JSON.parse(options.body) : null });
      if (remoteFails) return Response.json({ error: 'unavailable' }, { status: 503 });
      if (url.endsWith('connect-entitlements')) return Response.json({ sub: 'rocket-user', client_id: rules.CLIENT_ID, purchases: [purchase] });
      if (JSON.parse(options.body).action === 'catalog') return Response.json({ offers: [
        { id: 'another-offer', product_key: 'grow', billing_type: 'one_time', amount_cents: 19900, currency: 'usd' },
        { id: productId, product_key: product.product_key, billing_type: 'one_time', amount_cents: 3900, currency: 'usd' },
      ] });
      return Response.json({ checkout_url: 'https://checkout.stripe.com/c/pay/test' });
    },
  });
  return { calls, remoteCalls, invoke: body => handler(new Request('https://launch.test', {
    method: 'POST', headers: { Authorization: 'Bearer launch-session', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })) };
}

test('inactive product and cross-user draft cannot create Rocket checkout', async () => {
  for (const options of [{ enabled: false }, { owner: 'another-user' }]) {
    const app = await harness(options);
    assert.equal((await app.invoke({ action: 'buy', product_id: draftId, purchase_request_id: purchaseId })).status, 409);
    assert.equal(app.remoteCalls.some(call => call.body?.action === 'checkout'), false);
  }
});

test('checkout uses the configured product, approved return and stable request id', async () => {
  const app = await harness();
  const response = await app.invoke({ action: 'buy', product_id: draftId, purchase_request_id: purchaseId, product_key: 'attacker-product' });
  assert.equal(response.status, 200);
  const checkout = app.remoteCalls.find(call => call.body?.action === 'checkout').body;
  assert.equal(checkout.product_key, product.product_key);
  assert.equal(checkout.purchase_request_id, purchaseId);
  assert.equal(checkout.client_id, rules.CLIENT_ID);
  assert.equal(checkout.return_uri, 'https://trylaunch.ai/my-products?success=true');
});

test('failed verification, refunds, wrong products and unpaid returns never fulfil Pro', async () => {
  for (const options of [{ remoteFails: true }, { purchase: { ...paid, status: 'refunded' } },
    { purchase: { ...paid, product_id: draftId } }, { purchase: { ...paid, verified_paid: false } }]) {
    const app = await harness(options);
    assert.notEqual((await app.invoke({ action: 'fulfil', product_id: draftId, purchase_id: purchaseId, success: true })).status, 200);
    assert.equal(app.calls.length, 0);
  }
});

test('verified purchase reuses the existing atomic Pro fulfilment RPC', async () => {
  const app = await harness();
  assert.equal((await app.invoke({ action: 'fulfil', product_id: draftId, purchase_id: purchaseId })).status, 200);
  assert.equal(app.calls[0].name, 'fulfil_rocket_pro');
  assert.equal(app.calls[0].args.p_purchase_id, purchaseId);
  assert.equal(app.calls[0].args.p_user_id, 'launch-user');
  assert.equal(app.calls[0].args.p_product_id, draftId);
});

test('authenticated status derives identity and fulfilled purchase from linked subject and real order', async () => {
  const app = await harness();
  const status = await app.invoke({ action: 'status' });
  assert.equal(status.status, 200);
  const state = await status.json();
  assert.equal(state.identity_verified, true);
  assert.equal(state.rocket_subject, 'rocket-user');
  assert.deepEqual(state.fulfilments, []);
  assert.deepEqual(state.purchases, [{ purchase_id: purchaseId }]);
});
