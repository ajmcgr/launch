import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Rocket fulfilment uses the stable paid purchase id as an idempotency key', async () => {
  const [initial, serverAuth] = await Promise.all([
    readFile(new URL('../supabase/migrations/20261007024116_launch_rocket_one_time_fulfilment.sql', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20261007075223_rocket_id_server_auth.sql', import.meta.url), 'utf8'),
  ]);
  assert.match(initial, /orders_rocket_purchase_unique/);
  assert.match(serverAuth, /pg_advisory_xact_lock\(pg_catalog\.hashtextextended\(p_purchase_id::text, 0\)\)/);
  assert.match(serverAuth, /if found then[\s\S]*return existing\.id/);
  assert.match(serverAuth, /cfg\.enabled is not true/);
  assert.match(serverAuth, /owned draft required/);
});
