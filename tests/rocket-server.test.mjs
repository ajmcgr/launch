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
  const env = { LAUNCH_ROCKET_ACCEPTANCE_PRODUCT_KEY: "acceptance", LAUNCH_ROCKET_ACCEPTANCE_PLAN_ID: "plan" };
  const fetchMock = async url => {
    if (!accessValid) return new Response("{}", { status: 401 });
    const body = url.endsWith("rocket-connect-userinfo") ? { sub: subject } : {
      sub: subject, client_id: client, entitlements: purchased ? [{ product_key: "acceptance", active: true, status: "active", valid_until: new Date(Date.now() + 86400000).toISOString() }] : [],
    };
    return Response.json(body);
  };
  new Function("createRemoteJWKSet", "jwtVerify", ...Object.keys(rules), "Deno", "fetch", javascript)(
    () => keys.publicKey, jose.jwtVerify, ...Object.values(rules),
    { env: { get: key => env[key] }, serve: fn => { handler = fn; } }, fetchMock,
  );
  return (token, action = "protected") => handler(new Request("https://launch.test/access", {
    method: "POST", headers: { Authorization: "Bearer opaque_access_token", "X-Rocket-ID-Token": token, "Content-Type": "application/json", Origin: "https://trylaunch.ai" }, body: JSON.stringify({ action }),
  }));
}
async function token(overrides = {}, privateKey = keys.privateKey) {
  return new jose.SignJWT({ sub: "buyer", iss: rules.ISSUER, aud: rules.CLIENT_ID, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...overrides }).setProtectedHeader({ alg: "ES256" }).sign(privateKey);
}
test("signed Rocket identity alone never unlocks the acceptance resource", async () => {
  assert.equal((await harness()(await token())).status, 403);
  assert.equal((await harness({ purchased: true })(await token())).status, 200);
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
