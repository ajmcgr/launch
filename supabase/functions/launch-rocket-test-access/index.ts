import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { validVerifiedEmail } from "../launch-rocket-access/rules.ts";
import {
  AUTHORIZATION_ENDPOINT, CALLBACK, ISSUER, RETURN_URI, ROCKET_API,
  STATE, UUID, verifiedTestPurchases,
} from "./rules.ts";

const ORIGIN = "https://trylaunch.ai";
const TOKEN_ENDPOINT = `${ROCKET_API}/rocket-connect-token`;
const USERINFO_ENDPOINT = `${ROCKET_API}/rocket-connect-userinfo`;
const ENTITLEMENTS_ENDPOINT = `${ROCKET_API}/connect-entitlements`;
const CHECKOUT_ENDPOINT = `${ROCKET_API}/connect-payment-checkout`;
const jwks = createRemoteJWKSet(new URL(`${ROCKET_API}/rocket-connect-jwks`));
const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Vary": "Origin",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } });

class RemoteError extends Error {
  constructor(readonly status: number) { super("rocket_unavailable"); }
}
async function requestRocket(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new RemoteError(response.status);
  return response.json();
}
function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function encryptionKey() {
  const raw = Deno.env.get("ROCKET_AUTH_ENCRYPTION_KEY");
  if (!raw) throw new Error("test_not_configured");
  const bytes = decodeBase64url(raw);
  if (bytes.length !== 32) throw new Error("test_not_configured");
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value)));
  return `${base64url(iv)}.${base64url(ciphertext)}`;
}
async function decrypt(value: string) {
  const [iv, ciphertext, extra] = value.split(".");
  if (!iv || !ciphertext || extra) throw new Error("test_identity_unavailable");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decodeBase64url(iv) },
    await encryptionKey(), decodeBase64url(ciphertext));
  return new TextDecoder().decode(plaintext);
}
async function launchUser(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192) return null;
  const { data, error } = await admin().auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}
type TestConfig = {
  client_id: string; product_id: string; product_key: string;
  allowed_user_id: string; enabled: boolean;
};
async function configuration(userId: string): Promise<TestConfig> {
  const { data, error } = await admin().from("rocket_pro_test_configuration")
    .select("client_id,product_id,product_key,allowed_user_id,enabled").eq("singleton", true).single();
  if (error || !data || !data.enabled || data.allowed_user_id !== userId ||
      typeof data.client_id !== "string" || !/^rocket-dev-[A-Za-z0-9_-]+$/.test(data.client_id) ||
      typeof data.product_id !== "string" || !UUID.test(data.product_id) ||
      typeof data.product_key !== "string" || !data.product_key) throw new Error("test_not_configured");
  return data as TestConfig;
}
async function identity(userId: string) {
  const { data, error } = await admin().from("rocket_test_identities")
    .select("rocket_subject,access_token_ciphertext,token_expires_at,revoked_at")
    .eq("user_id", userId).maybeSingle();
  if (error || !data || data.revoked_at || Date.parse(data.token_expires_at) <= Date.now())
    throw new Error("test_rocket_sign_in_required");
  return { subject: data.rocket_subject as string, token: await decrypt(data.access_token_ciphertext) };
}
async function start(userId: string, clientId: string) {
  const state = random(); const nonce = random(); const verifier = random();
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const { error } = await admin().from("rocket_test_oauth_transactions").insert({
    state_hash: await sha256(state), user_id: userId,
    nonce_ciphertext: await encrypt(nonce), verifier_ciphertext: await encrypt(verifier),
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error("test_transaction_unavailable");
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: CALLBACK, response_type: "code",
    scope: "openid profile email entitlements:read", state, nonce,
    code_challenge: challenge, code_challenge_method: "S256",
  }).toString();
  return { state, authorization_url: url.toString() };
}
async function complete(userId: string, code: unknown, state: unknown, clientId: string) {
  if (typeof code !== "string" || !code || code.length > 2048 ||
      typeof state !== "string" || !STATE.test(state)) throw new Error("invalid_callback");
  const { data, error } = await admin().rpc("consume_rocket_test_oauth_transaction", { p_state_hash: await sha256(state) });
  const transaction = Array.isArray(data) ? data[0] : null;
  if (error || !transaction || transaction.user_id !== userId) throw new Error("invalid_callback");
  const tokens = await requestRocket(TOKEN_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId,
      redirect_uri: CALLBACK, code_verifier: await decrypt(transaction.verifier_ciphertext) }),
  });
  if (tokens?.token_type?.toLowerCase() !== "bearer" || typeof tokens.access_token !== "string" ||
      typeof tokens.id_token !== "string" || !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0 || tokens.expires_in > 3600) throw new Error("invalid_identity");
  const { payload } = await jwtVerify(tokens.id_token, jwks, {
    issuer: ISSUER, audience: clientId, algorithms: ["ES256"],
    requiredClaims: ["sub", "iat", "exp", "nonce"], maxTokenAge: "1h", clockTolerance: 5,
  });
  if (typeof payload.sub !== "string" || payload.nonce !== await decrypt(transaction.nonce_ciphertext))
    throw new Error("invalid_identity");
  const profile = await requestRocket(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const email = validVerifiedEmail(profile, payload.sub);
  const { data: launchAccount, error: userError } = await admin().auth.admin.getUserById(userId);
  if (userError || !email || launchAccount.user?.email?.toLowerCase() !== email)
    throw new Error("test_identity_mismatch");
  const { error: saveError } = await admin().from("rocket_test_identities").upsert({
    user_id: userId, rocket_subject: payload.sub, verified_email: email,
    access_token_ciphertext: await encrypt(tokens.access_token),
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    revoked_at: null, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (saveError) throw new Error("test_identity_mismatch");
  return { connected: true };
}
async function verifiedPurchases(userId: string, config: TestConfig) {
  const linked = await identity(userId);
  const response = await requestRocket(ENTITLEMENTS_ENDPOINT, { headers: { Authorization: `Bearer ${linked.token}` } });
  return { linked, purchases: verifiedTestPurchases(response, linked.subject, config) };
}
async function status(userId: string, config: TestConfig) {
  try {
    const { purchases } = await verifiedPurchases(userId, config);
    const { data: applied, error } = await admin().from("rocket_pro_test_fulfilments")
      .select("purchase_id,id,launch_product_id").eq("user_id", userId);
    if (error) throw error;
    return { connected: true, purchases, fulfilments: applied || [], buy_available: true };
  } catch (error) {
    if (error instanceof RemoteError && [401, 403].includes(error.status)) {
      await admin().from("rocket_test_identities").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId);
      return { connected: false, purchases: [], fulfilments: [], buy_available: false };
    }
    if (error instanceof Error && error.message === "test_rocket_sign_in_required")
      return { connected: false, purchases: [], fulfilments: [], buy_available: false };
    throw error;
  }
}
async function buy(userId: string, config: TestConfig, launchProductId: unknown, requestId: unknown) {
  if (typeof launchProductId !== "string" || !UUID.test(launchProductId) ||
      typeof requestId !== "string" || !UUID.test(requestId)) return json({ error: "invalid_purchase" }, 400);
  const database = admin();
  const { data: draft, error } = await database.from("products").select("id")
    .eq("id", launchProductId).eq("owner_id", userId).eq("status", "draft").maybeSingle();
  const { data: orders, error: orderError } = await database.from("orders")
    .select("id").eq("product_id", launchProductId).limit(1);
  if (error || orderError || !draft || orders?.length) return json({ error: "owned_unpaid_draft_required" }, 409);
  const linked = await identity(userId);
  const response = await requestRocket(CHECKOUT_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${linked.token}` },
    body: JSON.stringify({ product_key: config.product_key, return_uri: RETURN_URI, purchase_request_id: requestId }),
  });
  const url = new URL(response.checkout_url);
  if (url.origin !== "https://checkout.stripe.com") throw new Error("invalid_checkout_url");
  return json({ checkout_url: url.toString() });
}
async function fulfil(userId: string, config: TestConfig, launchProductId: unknown, purchaseId: unknown) {
  if (typeof launchProductId !== "string" || !UUID.test(launchProductId) ||
      typeof purchaseId !== "string" || !UUID.test(purchaseId)) return json({ error: "invalid_purchase" }, 400);
  const { linked, purchases } = await verifiedPurchases(userId, config);
  if (!purchases.some(purchase => purchase.purchase_id === purchaseId))
    return json({ error: "verified_test_purchase_required" }, 403);
  const { data, error } = await admin().rpc("fulfil_rocket_pro_test", {
    p_user_id: userId, p_subject: linked.subject, p_purchase_id: purchaseId,
    p_rocket_product_id: config.product_id, p_launch_product_id: launchProductId,
  });
  if (error) return json({ error: "test_purchase_could_not_be_applied" }, 409);
  return json({ fulfilment_id: data });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== ORIGIN) return json({ error: "origin_not_allowed" }, 403);
  if (Number(req.headers.get("content-length")) > 16_384) return json({ error: "request_too_large" }, 413);
  try {
    const user = await launchUser(req);
    if (!user) return json({ error: "launch_sign_in_required" }, 401);
    const config = await configuration(user.id);
    const body = await req.json();
    if (body?.action === "start") return json(await start(user.id, config.client_id));
    if (body?.action === "complete") return json(await complete(user.id, body.code, body.state, config.client_id));
    if (body?.action === "status") return json(await status(user.id, config));
    if (body?.action === "buy") return await buy(user.id, config, body.launch_product_id, body.purchase_request_id);
    if (body?.action === "fulfil") return await fulfil(user.id, config, body.launch_product_id, body.purchase_id);
    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "test_rocket_sign_in_required")
      return json({ error: "test_rocket_sign_in_required" }, 401);
    if (error instanceof RemoteError) return json({ error: "test_verification_unavailable" }, 503);
    return json({ error: "test_access_unavailable" }, 409);
  }
});
