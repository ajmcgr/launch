import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../supabase/functions/launch-rocket-access/index.ts', import.meta.url), 'utf8');
const client = await readFile(new URL('../src/lib/rocketAcceptance.ts', import.meta.url), 'utf8');

test('server validates signed Rocket identity and never returns raw Rocket credentials', () => {
  assert.match(source, /jwtVerify\(idToken, jwks/);
  assert.match(source, /issuer: ISSUER/);
  assert.match(source, /audience: CLIENT_ID/);
  assert.match(source, /payload\.nonce !== nonce/);
  assert.match(source, /validVerifiedEmail\(profile, payload\.sub\)/);
  assert.match(source, /access_token_ciphertext/);
  assert.doesNotMatch(source, /return \{ access_token/);
  assert.doesNotMatch(client, /access_token: tokens\./);
  assert.doesNotMatch(client, /id_token:/);
});

test('OAuth code exchange is one-use and browser callback requires a matching local state', () => {
  assert.match(source, /consume_rocket_oauth_transaction/);
  assert.match(source, /code_verifier: verifier/);
  assert.match(client, /state !== pending\.state/);
  assert.match(client, /sessionStorage\.removeItem\(PENDING_KEY\)/);
});

test('revoked or failed entitlement verification fails closed and requires a new Rocket sign-in', () => {
  assert.match(source, /\[401, 403\]\.includes\(error\.status\)/);
  assert.match(source, /revoked_at: new Date\(\)\.toISOString\(\)/);
  assert.match(source, /reauth_required: true/);
  assert.match(source, /product_unavailable/);
});
