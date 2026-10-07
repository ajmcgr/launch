import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import * as rules from "../supabase/functions/launch-rocket-access/rules.ts";
const jose = await import(process.env.ROCKET_TEST_JOSE_MODULE || "jose");
const keys = await jose.generateKeyPair("ES256");
const otherKeys = await jose.generateKeyPair("ES256");
const source = (await readFile(new URL("../supabase/functions/launch-rocket-access/index.ts", import.meta.url), "utf8")).replace(/^import .*;\n/gm, "");
const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
function harness({ client = rules.CLIENT_ID, subject = "buyer", accessValid = true, purchased = false } = {}) {
  let handler;
  const env = {};
  const config = { product_id: '10000000-0000-4000-8000-000000000001', product_key: 'test-fixture' };
  const query = { select: () => query, eq: () => query, single: async () => ({ data: config, error: null }), limit: async () => ({ data: [], error: null }) };
  const db = { from: () => query };
  const fetchMock = async url => {
    if (!accessValid) return new Response("{}", { status: 401 });
    const body = url.endsWith("rocket-connect-userinfo") ? { sub: subject } : {
      sub: subject, client_id: client, entitlements: [], purchases: purchased ? [{ ...config, purchase_id: '20000000-0000-4000-8000-000000000001', client_id: client, environment: 'production', billing_type: 'one_time', quantity: 1, status: 'granted', verified_paid: true, amount_cents: 3900, currency: 'usd', application_fee_cents: 195 }] : [],
    };
    return Response.json(body);
  };
  new Function("createClient", "createRemoteJWKSet", "jwtVerify", ...Object.keys(rules), "Deno", "fetch", javascript)(
    () => db, () => keys.publicKey, jose.jwtVerify, ...Object.values(rules),
    { env: { get: key => env[key] }, serve: fn => { handler = fn; } }, fetchMock,
  );
  return (token, action = "status") => handler(new Request("https://launch.test/access", {
    method: "POST", headers: { Authorization: "Bearer opaque_access_token", "X-Rocket-ID-Token": token, "Content-Type": "application/json", Origin: "https://trylaunch.ai" }, body: JSON.stringify({ action }),
  }));
}
async function token(overrides = {}, privateKey = keys.privateKey) {
  return new jose.SignJWT({ sub: "buyer", iss: rules.ISSUER, aud: rules.CLIENT_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...overrides }).setProtectedHeader({ alg: "ES256" }).sign(privateKey);
}
test("signed identity alone produces no Pro purchase; verified purchase is separate", async () => {
  assert.equal((await (await harness()(await token())).json()).purchases.length, 0);
  assert.equal((await (await harness({ purchased: true })(await token())).json()).purchases.length, 1);
  assert.equal((await harness({ purchased: true })(await token(), 'fulfil')).status, 401);
});
test("invalid signature, issuer, audience, expiry and missing required claims fail closed", async () => {
  const request = harness({ purchased: true });
  for (const overrides of [{ iss: "https://attacker.test" }, { aud: "another-app" }, { exp: 1 }, { iat: undefined }, { sub: undefined }]) assert.equal((await request(await token(overrides))).status, 401);
  assert.equal((await request(await token({}, otherKeys.privateKey))).status, 401);
  assert.equal((await request("not.a.jwt")).status, 401);
});
test("current opaque token must match the buyer and Launch client and remain unrevoked", async () => {
  const signed = await token();
  for (const options of [{ accessValid: false }, { client: "another-app" }, { subject: "another-buyer" }]) assert.equal((await harness({ ...options, purchased: true })(signed)).status, 401);
});
