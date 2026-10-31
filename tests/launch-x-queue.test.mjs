import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../supabase/functions/post-launch-tweet-launch/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness({ idle = false, username = 'trylaunchai', response, timeout = false } = {}) {
  let handler;
  const calls = [];
  const network = [];
  const database = { rpc: async (name, args) => {
    calls.push({ name, args });
    return { data: name === 'claim_launch_x_post' ? idle ? null : { product_id: 'product', attempt_id: 'attempt' } : true, error: null };
  } };
  const context = vm.createContext({
    exports: {}, crypto, TextEncoder, Response, Request, AbortSignal, btoa, Uint8Array,
    console: { log() {}, error() {} },
    Deno: { env: { get: name => name === 'SUPABASE_URL' ? 'https://launch.test' : 'server-secret' }, serve: fn => { handler = fn; } },
    require: () => ({ createClient: () => database }),
    fetch: async (url, options) => {
      network.push({ url, method: options?.method || 'GET' });
      if (url.endsWith('/users/me')) return Response.json({ data: { username } });
      if (timeout) throw new Error('Timed out');
      return response || Response.json({ success: true, result: { data: { id: 'tweet-id' } } });
    },
  });
  vm.runInContext(compiled, context);
  return { calls, network, context, invoke: (authorized = true) => handler(new Request('https://launch.test/queue', {
    method: 'POST', headers: { ...(authorized ? { Authorization: 'Bearer server-secret' } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'process_queue' }),
  })) };
}

test('unauthorized callers cannot claim or post queue items', async () => {
  const app = harness();
  assert.equal((await app.invoke(false)).status, 401);
  assert.equal(app.calls.length, 0);
  assert.equal(app.network.length, 0);
});

test('empty or rate-gated queue never calls X', async () => {
  const app = harness({ idle: true });
  assert.equal((await app.invoke()).status, 200);
  assert.equal(app.network.length, 0);
});

test('verified Launch account processes one claimed app and records its post id', async () => {
  const app = harness();
  assert.equal((await (await app.invoke()).json()).posted, true);
  assert.equal(app.network.filter(call => call.method === 'POST').length, 1);
  const finish = app.calls.find(call => call.name === 'finish_launch_x_post').args;
  assert.equal(finish.p_attempt_id, 'attempt');
  assert.equal(finish.p_status, 'posted');
  assert.equal(finish.p_post_id, 'tweet-id');
});

test('personal or other X accounts are never posted to', async () => {
  const app = harness({ username: 'alexmacgregor__' });
  assert.equal((await (await app.invoke()).json()).posted, false);
  assert.equal(app.network.some(call => call.method === 'POST'), false);
  assert.equal(app.calls.at(-1).args.p_status, 'queued');
});

test('explicit X rate limits retry but ambiguous timeouts require review', async () => {
  for (const [options, status] of [
    [{ response: Response.json({ detail: 'X API error [429]: limit' }, { status: 502 }) }, 'queued'],
    [{ timeout: true }, 'review'],
    [{ response: Response.json({ detail: 'X API error [500]: unknown' }, { status: 502 }) }, 'review'],
  ]) {
    const app = harness(options);
    await app.invoke();
    assert.equal(app.calls.at(-1).args.p_status, status);
  }
});

test('post text stays conservatively below X limits and preserves the app URL', () => {
  const app = harness();
  const url = 'https://trylaunch.ai/launch/example';
  const text = vm.runInContext(`boundedPostText(${JSON.stringify('Product '.repeat(100) + '界'.repeat(100))}, ${JSON.stringify(url)})`, app.context);
  assert.equal(text.endsWith(`\n\n${url}`), true);
  const body = text.slice(0, -url.length - 2);
  const weight = Array.from(body).reduce((sum, char) => sum + (char.codePointAt(0) > 127 ? 2 : 1), 0);
  assert.ok(weight + 2 + 23 <= 280);
});

test('queue is future-only, service-only, paced and never reclaims uncertain posts', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261031021830_launch_x_announcements_queue.sql', import.meta.url), 'utf8');
  assert.match(sql, /interval '15 minutes'/);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /set status = 'review'/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /from public, anon, authenticated/);
  assert.doesNotMatch(sql, /insert into public\.launch_x_post_queue[^;]*select/i);
  const scheduler = await readFile(new URL('../supabase/functions/launch-scheduler/index.ts', import.meta.url), 'utf8');
  assert.match(scheduler, /const TWEET_FUNCTIONS = \['post-launch-tweet'\]/);
  assert.match(scheduler, /action: 'process_queue'/);
});
