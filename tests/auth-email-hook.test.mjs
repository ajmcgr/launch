import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHmac, timingSafeEqual } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/send-auth-email/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const secret = Buffer.from('launch-email-hook-regression-key').toString('base64');
const payload = JSON.stringify({
  user: { email: 'signup@example.test' },
  email_data: { token_hash: 'test-token-hash', redirect_to: 'https://trylaunch.ai/submit', email_action_type: 'signup' },
});

function harness(configuredSecret = `v1,whsec_${secret}`) {
  let handler;
  const sent = [];
  const verifiedKeys = [];
  // Model the Standard Webhooks constructor contract and signed-request format.
  class Webhook {
    constructor(value) {
      const key = value.replace(/^whsec_/, '');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(key)) throw new Error('Invalid base64 key');
      this.key = Buffer.from(key, 'base64');
      verifiedKeys.push(key);
    }
    verify(body, headers) {
      const id = headers['webhook-id'];
      const timestamp = headers['webhook-timestamp'];
      if (!id || !timestamp || !headers['webhook-signature']) throw new Error('Missing webhook signature');
      if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('Expired webhook');
      const expected = createHmac('sha256', this.key).update(`${id}.${timestamp}.${body}`).digest();
      const actual = Buffer.from(headers['webhook-signature'].replace(/^v1,/, ''), 'base64');
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid signature');
      return JSON.parse(body);
    }
  }
  vm.runInNewContext(compiled, {
    exports: {}, Response, console: { log() {}, error() {} },
    Deno: { env: { get: name => name === 'SEND_EMAIL_HOOK_SECRET' ? configuredSecret : 'https://launch.test' } },
    require: name => {
      if (name.includes('standardwebhooks')) return { Webhook };
      if (name.includes('resend')) return { Resend: class {
        emails = { send: async email => { sent.push(email); return { data: { id: 'test-message' }, error: null }; } };
      } };
      if (name.includes('/http/server')) return { serve: fn => { handler = fn; } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    sent, verifiedKeys,
    invoke({ body = payload, signedBody = body, signed = true, timestamp = Math.floor(Date.now() / 1000) } = {}) {
      const id = 'test-hook-id';
      const headers = { 'Content-Type': 'application/json' };
      if (signed) Object.assign(headers, {
        'webhook-id': id, 'webhook-timestamp': String(timestamp),
        'webhook-signature': `v1,${createHmac('sha256', Buffer.from(secret, 'base64')).update(`${id}.${timestamp}.${signedBody}`).digest('base64')}`,
      });
      return handler(new Request('https://launch.test/send-auth-email', { method: 'POST', headers, body }));
    },
  };
}

test('Supabase versioned hook secret is normalized before signed email delivery', async () => {
  const app = harness(`  v1,whsec_${secret}\n`);
  assert.equal((await app.invoke()).status, 200);
  assert.deepEqual(app.verifiedKeys, [secret]);
  assert.equal(app.sent.length, 1);
  assert.deepEqual(Array.from(app.sent[0].to), ['signup@example.test']);
});

test('existing raw and whsec-prefixed secrets remain compatible', async () => {
  for (const configuredSecret of [secret, `whsec_${secret}`]) {
    const app = harness(configuredSecret);
    assert.equal((await app.invoke()).status, 200);
    assert.equal(app.sent.length, 1);
  }
});

test('missing or malformed secrets fail closed without sending email', async () => {
  for (const configuredSecret of [undefined, '', 'invalid,secret']) {
    const app = harness(configuredSecret === undefined ? null : configuredSecret);
    assert.equal((await app.invoke()).status, 401);
    assert.equal(app.sent.length, 0);
  }
});

test('unsigned, tampered and expired requests never send email', async () => {
  for (const request of [
    { signed: false },
    { body: payload.replace('signup@example.test', 'attacker@example.test'), signedBody: payload },
    { timestamp: Math.floor(Date.now() / 1000) - 600 },
  ]) {
    const app = harness();
    assert.equal((await app.invoke(request)).status, 401);
    assert.equal(app.sent.length, 0);
  }
});
