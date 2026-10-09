import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../supabase/functions/launch-rocket-access/rules.ts';

const source = await readFile(new URL('../supabase/functions/launch-rocket-access/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function identityHarness({ payload, tokenError, profile } = {}) {
  const exports = {};
  let userinfoCalls = 0;
  vm.runInNewContext(`${compiled}\nexports.verifiedIdentity = verifiedIdentity;`, {
    exports, URL, URLSearchParams, Response, AbortSignal, TextEncoder, TextDecoder, crypto,
    Deno: { env: { get: () => 'test' }, serve: () => {} },
    require: (name) => name.includes('jose')
      ? {
          createRemoteJWKSet: () => ({}),
          jwtVerify: async () => {
            if (tokenError) throw tokenError;
            return { payload };
          },
        }
      : name.includes('supabase-js') ? { createClient: () => ({}) } : rules,
    fetch: async () => {
      userinfoCalls++;
      return Response.json(profile);
    },
  });
  return { verify: exports.verifiedIdentity, userinfoCalls: () => userinfoCalls };
}

test('invalid ID-token signature rejects before userinfo or session creation', async () => {
  const app = identityHarness({ tokenError: new Error('invalid signature') });
  await assert.rejects(app.verify('server-token', 'invalid-id-token', 'expected-nonce'), /invalid signature/);
  assert.equal(app.userinfoCalls(), 0);
});

test('ID-token nonce and verified userinfo subject must agree', async () => {
  const wrongNonce = identityHarness({ payload: { sub: 'rocket-user', nonce: 'another-nonce' } });
  await assert.rejects(wrongNonce.verify('server-token', 'id-token', 'expected-nonce'), /invalid_identity/);
  assert.equal(wrongNonce.userinfoCalls(), 0);

  const wrongSubject = identityHarness({
    payload: { sub: 'rocket-user', nonce: 'expected-nonce' },
    profile: { sub: 'other-user', email: 'controlled@example.test', email_verified: true },
  });
  await assert.rejects(wrongSubject.verify('server-token', 'id-token', 'expected-nonce'), /unverified_email/);
});
