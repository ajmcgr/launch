import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

// Execute the real callback with an isolated browser and Auth transport.
// No network, credentials, or production user data are used.
const source = (await readFile(new URL('../src/lib/rocketAcceptance.ts', import.meta.url), 'utf8'))
  .replace("import { supabase } from '@/integrations/supabase/client';", 'let supabase; export function setClient(client) { supabase = client; }')
  .replace('import.meta.env.VITE_SUPABASE_URL', "'https://launch.test'");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { completeRocketLogin, setClient } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const original = Object.fromEntries(['sessionStorage', 'document', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const state = 's'.repeat(43);
let calls;

beforeEach(() => {
  calls = [];
  const storage = new Map([['launch:rocket:pending', JSON.stringify([{ state, created_at: Date.now() }])]]);
  globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  globalThis.document = { cookie: '' };
  globalThis.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return Response.json({ email: 'controlled@example.test', token_hash: 'synthetic-hash', return_path: '/auth' });
  };
});
afterEach(() => {
  for (const [key, descriptor] of Object.entries(original)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('callback establishes a session through the real SDK token-hash request shape', async () => {
  const authRequests = [];
  setClient(createClient('https://auth.example.test', 'synthetic-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      assert.equal(new URL(url).pathname, '/auth/v1/verify');
      const body = JSON.parse(options.body);
      authRequests.push(body);
      if (body.email || body.token || body.phone) return Response.json({ msg: 'Only the token_hash and type should be provided' }, { status: 400 });
      return Response.json({ access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token', token_type: 'bearer', expires_in: 3600, user: { id: '10000000-0000-4000-8000-000000000001' } });
    } },
  }));
  assert.equal(await completeRocketLogin(`?state=${state}&code=synthetic-code`), '/auth');
  assert.deepEqual(calls, [{ action: 'complete', code: 'synthetic-code', state }]);
  assert.deepEqual(authRequests, [{ token_hash: 'synthetic-hash', type: 'magiclink', gotrue_meta_security: {} }]);
  await assert.rejects(completeRocketLogin(`?state=${state}&code=synthetic-code`), /not completed/);
  assert.equal(calls.length, 1, 'consumed callback cannot be replayed');
});

test('mismatched state stops before code exchange or session verification', async () => {
  setClient({ auth: { verifyOtp: () => assert.fail('must not verify') } });
  await assert.rejects(completeRocketLogin(`?state=${'x'.repeat(43)}&code=synthetic-code`), /not completed/);
  assert.equal(calls.length, 0);
});

test('Auth rejection propagates without reporting successful sign-in', async () => {
  setClient({ auth: { verifyOtp: async () => ({ error: new Error('Expired token') }) } });
  await assert.rejects(completeRocketLogin(`?state=${state}&code=synthetic-code`), /Expired token/);
});
