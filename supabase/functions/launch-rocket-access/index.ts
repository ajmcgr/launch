import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  AUTHORIZATION_ENDPOINT,
  APP_ID,
  CALLBACK,
  CLIENT_ID,
  ISSUER,
  OAUTH_SCOPE,
  ROCKET_API,
  STATE,
  UUID,
  isActiveOneTimePurchase,
  validReturnPath,
  validVerifiedEmail,
  type CanonicalProduct,
} from "./rules.ts";

const ROCKET_JWKS = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1/rocket-connect-jwks";
const TOKEN_ENDPOINT = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1/rocket-connect-token";
const USERINFO_ENDPOINT = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1/rocket-connect-userinfo";
const ENTITLEMENTS_ENDPOINT = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1/connect-entitlements";
const BUY_ENDPOINT = `${ROCKET_API}/rocket-buy`;
const ACCEPTANCE_ENDPOINT = `${ROCKET_API}/launch-rocket-acceptance`;
const BUY_RETURN = "https://trylaunch.ai/my-products?success=true";
const ORIGIN = "https://trylaunch.ai";
const jwks = createRemoteJWKSet(new URL(ROCKET_JWKS));

const headers = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const admin = () => createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

class RemoteError extends Error {
  constructor(readonly status: number, readonly code?: string, readonly checkoutStatus?: string) { super("rocket_unavailable"); }
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function random() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function encryptionKey() {
  const configured = Deno.env.get("ROCKET_AUTH_ENCRYPTION_KEY");
  if (!configured) throw new Error("rocket_not_configured");
  const raw = decodeBase64url(configured);
  if (raw.length !== 32) throw new Error("rocket_not_configured");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value)));
  return `${base64url(iv)}.${base64url(ciphertext)}`;
}
async function decrypt(value: string) {
  const [encodedIv, encodedCiphertext, extra] = value.split(".");
  if (!encodedIv || !encodedCiphertext || extra) throw new Error("rocket_not_configured");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBase64url(encodedIv) },
    await encryptionKey(),
    decodeBase64url(encodedCiphertext),
  );
  return new TextDecoder().decode(plaintext);
}
async function requestRocket(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    throw new RemoteError(response.status, failure?.error, failure?.checkout_status);
  }
  return response.json();
}
async function currentLaunchUser(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || authorization.length > 8192) return null;
  const { data, error } = await admin().auth.getUser(authorization.slice(7));
  return error ? null : data.user;
}
async function configuration(): Promise<CanonicalProduct> {
  const { data, error } = await admin().from("rocket_pro_configuration")
    .select("product_id, product_key, enabled").eq("singleton", true).single();
  if (error || !data) return { product_id: null, product_key: null, enabled: false };
  return { product_id: data.product_id, product_key: data.product_key, enabled: data.enabled === true };
}
async function buyAvailable() {
  const product = await configuration();
  if (!product.enabled || !product.product_id || !product.product_key) return false;
  const catalog = await requestRocket(BUY_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "catalog", app_id: APP_ID }),
  });
  const offers = Array.isArray(catalog?.offers) ? catalog.offers : catalog?.plan ? [catalog.plan] : [];
  return offers.some((offer: any) => offer.id === product.product_id && offer.product_key === product.product_key &&
    offer.billing_type === "one_time" && offer.amount_cents === 3900 && offer.currency === "usd");
}
async function verifiedIdentity(accessToken: string, idToken: string, nonce: string) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ISSUER,
    audience: CLIENT_ID,
    algorithms: ["ES256"],
    requiredClaims: ["sub", "iat", "exp", "nonce"],
    maxTokenAge: "1h",
    clockTolerance: 5,
  });
  if (typeof payload.sub !== "string" || !payload.sub || payload.nonce !== nonce) throw new Error("invalid_identity");
  const profile = await requestRocket(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
  const email = validVerifiedEmail(profile, payload.sub);
  if (!email) throw new Error("unverified_email");
  return { subject: payload.sub, email };
}
async function launchUserForRocketIdentity(subject: string, email: string, encryptedAccessToken: string, tokenExpiresAt: string) {
  const database = admin();
  const { data: existingIdentity, error: identityError } = await database.from("rocket_identities")
    .select("user_id").eq("rocket_subject", subject).maybeSingle();
  if (identityError) throw new Error("identity_unavailable");

  let userId = existingIdentity?.user_id as string | undefined;
  if (!userId) {
    const { data: existingUser, error: lookupError } = await database.rpc("find_verified_launch_user_by_email", { p_email: email });
    if (lookupError) throw new Error("identity_unavailable");
    userId = existingUser || undefined;
  }
  if (!userId) {
    const { data: created, error: createError } = await database.auth.admin.createUser({ email, email_confirm: true });
    if (createError || !created.user) {
      // A concurrent trusted flow may have created the exact account. Re-read;
      // never fall back to a second account or a different email.
      const { data: concurrent, error: lookupError } = await database.rpc("find_verified_launch_user_by_email", { p_email: email });
      if (lookupError || !concurrent) throw new Error("launch_account_unavailable");
      userId = concurrent;
    } else {
      userId = created.user.id;
    }
  }

  const { error: linkError } = await database.rpc("link_verified_rocket_identity", {
    p_user_id: userId,
    p_subject: subject,
    p_email: email,
    p_access_token_ciphertext: encryptedAccessToken,
    p_token_expires_at: tokenExpiresAt,
  });
  if (linkError) throw new Error("identity_link_conflict");
  return { userId, email };
}
async function sessionBootstrap(email: string) {
  const { data, error } = await admin().auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: CALLBACK },
  });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) throw new Error("session_unavailable");
  return { email, token_hash: tokenHash };
}
async function start(returnPath: unknown) {
  await encryptionKey();
  const state = random();
  const nonce = random();
  const verifier = random();
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const { error } = await admin().from("rocket_oauth_transactions").insert({
    state_hash: await sha256(state),
    nonce_ciphertext: await encrypt(nonce),
    verifier_ciphertext: await encrypt(verifier),
    return_path: validReturnPath(returnPath) ? returnPath : "/",
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw new Error("transaction_unavailable");
  const authorization = new URL(AUTHORIZATION_ENDPOINT);
  authorization.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK,
    response_type: "code",
    scope: OAUTH_SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return { state, authorization_url: authorization.toString() };
}
async function complete(code: unknown, state: unknown) {
  if (typeof code !== "string" || !code || code.length > 2048 || typeof state !== "string" || !STATE.test(state)) {
    throw new Error("invalid_callback");
  }
  const { data, error } = await admin().rpc("consume_rocket_oauth_transaction", { p_state_hash: await sha256(state) });
  const transaction = Array.isArray(data) ? data[0] : null;
  if (error || !transaction) throw new Error("invalid_callback");
  const verifier = await decrypt(transaction.verifier_ciphertext);
  const nonce = await decrypt(transaction.nonce_ciphertext);
  const tokens = await requestRocket(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      redirect_uri: CALLBACK,
      code_verifier: verifier,
    }),
  });
  if (tokens?.token_type?.toLowerCase() !== "bearer" || typeof tokens.access_token !== "string" ||
    typeof tokens.id_token !== "string" || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 3600) {
    throw new Error("invalid_identity");
  }
  const identity = await verifiedIdentity(tokens.access_token, tokens.id_token, nonce);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await launchUserForRocketIdentity(identity.subject, identity.email, await encrypt(tokens.access_token), expiresAt);
  return { ...(await sessionBootstrap(identity.email)), return_path: transaction.return_path };
}
async function status(userId: string) {
  const { data: connection, error } = await admin().from("rocket_identities")
    .select("rocket_subject, access_token_ciphertext, token_expires_at, revoked_at")
    .eq("user_id", userId).maybeSingle();
  if (error) throw new Error("identity_unavailable");
  if (!connection || connection.revoked_at || new Date(connection.token_expires_at).getTime() <= Date.now()) {
    return { connected: false, reauth_required: true, identity_verified: false, rocket_subject: null, purchases: [], fulfilments: [], buy_available: false };
  }
  try {
    const accessToken = await decrypt(connection.access_token_ciphertext);
    const entitlements = await requestRocket(ENTITLEMENTS_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } });
    const identityVerified = entitlements?.sub === connection.rocket_subject && entitlements?.client_id === CLIENT_ID;
    if (!identityVerified) throw new Error("identity_mismatch");
    const product = await configuration();
    const { data: used, error: usedError } = await admin().from("orders")
      .select("id,product_id,plan,rocket_purchase_id,rocket_client_id,rocket_subject,rocket_product_id")
      .eq("user_id", userId).not("rocket_purchase_id", "is", null);
    if (usedError) throw new Error("orders_unavailable");
    return {
      connected: true,
      reauth_required: false,
      identity_verified: true,
      rocket_subject: connection.rocket_subject,
      purchases: isActiveOneTimePurchase(entitlements, connection.rocket_subject, product)
        .filter(purchase => !(used || []).some(order => order.rocket_purchase_id === purchase.purchase_id))
        .map((purchase) => ({ purchase_id: purchase.purchase_id })),
      fulfilments: (used || []).filter(order => order.plan === "skip" && order.rocket_client_id === CLIENT_ID &&
        order.rocket_subject === connection.rocket_subject && order.rocket_product_id === product.product_id)
        .map(order => ({ purchase_id: order.rocket_purchase_id, order_id: order.id,
          launch_product_id: order.product_id, rocket_product_id: order.rocket_product_id,
          rocket_client_id: order.rocket_client_id, rocket_subject: order.rocket_subject })),
      buy_available: await buyAvailable(),
    };
  } catch (error) {
    if (error instanceof RemoteError && [401, 403].includes(error.status)) {
      await admin().from("rocket_identities").update({ revoked_at: new Date().toISOString() }).eq("user_id", userId);
      return { connected: false, reauth_required: true, identity_verified: false, rocket_subject: null, purchases: [], fulfilments: [], buy_available: false };
    }
    throw error;
  }
}

async function connectedIdentity(userId: string) {
  const { data, error } = await admin().from("rocket_identities")
    .select("rocket_subject, access_token_ciphertext, token_expires_at, revoked_at")
    .eq("user_id", userId).maybeSingle();
  if (error || !data || data.revoked_at || new Date(data.token_expires_at).getTime() <= Date.now()) {
    throw new Error("rocket_sign_in_required");
  }
  return { subject: data.rocket_subject, token: await decrypt(data.access_token_ciphertext) };
}

async function buy(userId: string, productId: unknown, requestId: unknown) {
  if (typeof productId !== "string" || !UUID.test(productId) || typeof requestId !== "string" || !UUID.test(requestId)) {
    return json({ error: "invalid_purchase" }, 400);
  }
  if (!await buyAvailable()) return json({ error: "product_unavailable" }, 409);
  const { data: draft, error } = await admin().from("products").select("id")
    .eq("id", productId).eq("owner_id", userId).eq("status", "draft").maybeSingle();
  const { data: orders, error: orderError } = await admin().from("orders").select("id").eq("product_id", productId).limit(1);
  if (error || orderError || !draft || orders?.length) return json({ error: "owned_unpaid_draft_required" }, 409);
  const identity = await connectedIdentity(userId);
  const product = await configuration();
  const response = await requestRocket(BUY_ENDPOINT, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${identity.token}` },
    body: JSON.stringify({ action: "checkout", app_id: APP_ID, client_id: CLIENT_ID,
      product_key: product.product_key, return_uri: BUY_RETURN, purchase_request_id: requestId }),
  });
  const checkout = new URL(response.checkout_url);
  if (checkout.origin !== "https://checkout.stripe.com") throw new Error("invalid_checkout_url");
  return json({ checkout_url: checkout.toString() });
}

async function confirmAcceptance(req: Request, userId: string, purchaseId: unknown) {
  if (typeof purchaseId !== "string" || !UUID.test(purchaseId)) return false;
  const identity = await connectedIdentity(userId);
  const { data: order, error } = await admin().from("orders")
    .select("id,rocket_subject,rocket_client_id,rocket_product_id")
    .eq("user_id", userId).eq("rocket_purchase_id", purchaseId).maybeSingle();
  if (error || !order || order.rocket_subject !== identity.subject || order.rocket_client_id !== CLIENT_ID) return false;
  const product = await configuration();
  if (!product.enabled || order.rocket_product_id !== product.product_id) return false;
  const launchAuthorization = req.headers.get("authorization");
  if (!launchAuthorization?.startsWith("Bearer ")) return false;
  try {
    const proof = await requestRocket(ACCEPTANCE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${identity.token}`,
        "X-Launch-Authorization": launchAuthorization },
      body: JSON.stringify({ action: "proof" }),
    });
    return proof?.verified === true && proof.purchase_id === purchaseId;
  } catch { return false; }
}

async function fulfil(req: Request, userId: string, productId: unknown, purchaseId: unknown) {
  if (typeof productId !== "string" || !UUID.test(productId) || typeof purchaseId !== "string" || !UUID.test(purchaseId)) {
    return json({ error: "invalid_purchase" }, 400);
  }
  const identity = await connectedIdentity(userId);
  const product = await configuration();
  const entitlements = await requestRocket(ENTITLEMENTS_ENDPOINT, { headers: { Authorization: `Bearer ${identity.token}` } });
  if (!isActiveOneTimePurchase(entitlements, identity.subject, product).some(p => p.purchase_id === purchaseId)) {
    return json({ error: "verified_purchase_required" }, 403);
  }
  const { data: orderId, error } = await admin().rpc("fulfil_rocket_pro", {
    p_user_id: userId, p_subject: identity.subject, p_purchase_id: purchaseId,
    p_rocket_product_id: product.product_id, p_product_id: productId,
  });
  if (error) return json({ error: "purchase_could_not_be_applied" }, 409);
  return json({ order_id: orderId, acceptance_verified: await confirmAcceptance(req, userId, purchaseId) });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== ORIGIN) return json({ error: "origin_not_allowed" }, 403);
  if (Number(req.headers.get("content-length")) > 16_384) return json({ error: "request_too_large" }, 413);
  try {
    const body = await req.json();
    if (body?.action === "availability") {
      try { await encryptionKey(); return json({ available: true }); }
      catch { return json({ available: false }); }
    }
    if (body?.action === "buy_availability") {
      try { return json({ available: await buyAvailable() }); }
      catch { return json({ available: false }); }
    }
    if (body?.action === "start") return json(await start(body.return_path));
    if (body?.action === "complete") return json(await complete(body.code, body.state));

    const user = await currentLaunchUser(req);
    if (!user) return json({ error: "launch_sign_in_required" }, 401);
    if (body?.action === "status") return json(await status(user.id));
    if (body?.action === "buy") return await buy(user.id, body.product_id, body.purchase_request_id);
    if (body?.action === "fulfil") return await fulfil(req, user.id, body.product_id, body.purchase_id);
    if (body?.action === "confirm_acceptance") return json({ verified: await confirmAcceptance(req, user.id, body.purchase_id) });
    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "rocket_sign_in_required") return json({ error: "rocket_sign_in_required" }, 401);
    if (error instanceof RemoteError && error.code === "purchase_request_already_used") {
      return json({ error: "purchase_request_already_used", checkout_status: error.checkoutStatus === "expired" ? "expired" : "complete" }, 409);
    }
    if (error instanceof RemoteError) return json({ error: "verification_unavailable" }, 503);
    return json({ error: "verification_unavailable" }, 401);
  }
});
