import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CLIENT_ID, APP_ID, CALLBACK, ISSUER, ROCKET_API, UUID, verifiedPurchases, isProOffer } from "./rules.ts";

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
async function configuration() {
  const { data, error } = await admin().from('rocket_pro_configuration').select('product_id,product_key').eq('singleton', true).single();
  if (error) throw new Error('configuration_unavailable');
  return data;
}

const jwks = createRemoteJWKSet(new URL(`${ROCKET_API}/rocket-connect-jwks`));
const headers = {
  "Access-Control-Allow-Origin": "https://trylaunch.ai",
  "Access-Control-Allow-Headers": "content-type,authorization,x-rocket-id-token,x-launch-access-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS", "Vary": "Origin",
  "Content-Type": "application/json", "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
async function rocket(path: string, init?: RequestInit) {
  const response = await fetch(`${ROCKET_API}/${path}`, { ...init, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error("rocket_unavailable");
  return response.json();
}
async function identity(accessToken: string, idToken: string, nonce?: string) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ISSUER, audience: CLIENT_ID, algorithms: ["ES256"],
    requiredClaims: ["sub", "iat", "exp"], maxTokenAge: "1h", clockTolerance: 5,
  });
  if (typeof payload.sub !== "string" || !payload.sub || (nonce !== undefined && payload.nonce !== nonce)) throw new Error("invalid_identity");
  const user = await rocket("rocket-connect-userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (user.sub !== payload.sub) throw new Error("invalid_identity");
  // Entitlements also binds the opaque access token to this exact OAuth client.
  const entitlements = await rocket("connect-entitlements", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (entitlements.sub !== payload.sub || entitlements.client_id !== CLIENT_ID) throw new Error("invalid_identity");
  return { sub: payload.sub, entitlements };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://trylaunch.ai") return json({ error: "origin_not_allowed" }, 403);
  if (Number(req.headers.get("content-length")) > 16384) return json({ error: "request_too_large" }, 413);
  try {
    const body = await req.json();
    if (body.action === "config") return json({ client_id: CLIENT_ID, callback: CALLBACK, authorization_endpoint: "https://tryrocket.ai/connect/authorize", scope: "openid profile entitlements:read" });
    if (body.action === "offer") {
      const catalog = await rocket("rocket-buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "catalog", app_id: APP_ID }) });
      return json({ available: isProOffer(catalog.plan, await configuration()), buy_url: `https://tryrocket.ai/apps/${APP_ID}`, amount_cents: 3900, currency: 'usd', billing_type: 'one_time' });
    }
    if (body.action === "complete") {
      if (typeof body.code !== "string" || body.code.length > 512 || !/^[A-Za-z0-9_-]{43,128}$/.test(body.verifier) || !/^[A-Za-z0-9_-]{43}$/.test(body.nonce)) return json({ error: "invalid_callback" }, 400);
      const tokens = await rocket("rocket-connect-token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code: body.code, client_id: CLIENT_ID, redirect_uri: CALLBACK, code_verifier: body.verifier }),
      });
      if (tokens.token_type?.toLowerCase() !== "bearer" || typeof tokens.access_token !== "string" || typeof tokens.id_token !== "string" || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 3600) throw new Error("invalid_identity");
      await identity(tokens.access_token, tokens.id_token, body.nonce);
      return json({ access_token: tokens.access_token, id_token: tokens.id_token, expires_in: tokens.expires_in });
    }
    if (!["status", "link", "fulfil", "pilot-offer", "pilot-checkout", "proof"].includes(body.action)) return json({ error: "invalid_action" }, 400);
    const authorization = req.headers.get("authorization") || "";
    const idToken = req.headers.get("x-rocket-id-token") || "";
    if (!/^Bearer [A-Za-z0-9_-]+$/.test(authorization) || !idToken || idToken.length > 8192) return json({ error: "sign_in_required" }, 401);
    const session = await identity(authorization.slice(7), idToken);
    const config = await configuration();
    const purchases = verifiedPurchases(session.entitlements, session.sub, config);
    if (body.action === 'pilot-offer') {
      const offer = await rocket('launch-rocket-acceptance', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ action: 'status' }) });
      return json({ available: offer.available === true && isProOffer(offer.plan, config), private: true });
    }
    if (body.action === 'proof') {
      if (!purchases.length) return json({ error: 'verified_purchase_required' }, 403);
      return json(await rocket('launch-rocket-acceptance', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization, 'X-Rocket-ID-Token': idToken }, body: JSON.stringify({ action: 'proof' }) }));
    }
    if (body.action === 'status') {
      let fulfilments: any[] = [];
      if (config?.product_id) {
        const { data, error } = await admin().from('orders').select('id,product_id,rocket_purchase_id')
          .eq('rocket_subject', session.sub).eq('rocket_client_id', CLIENT_ID).eq('rocket_product_id', config.product_id).limit(100);
        if (error) throw new Error('fulfilments_unavailable');
        fulfilments = (data || []).map((o: any) => ({ order_id: o.id, product_id: o.product_id, purchase_id: o.rocket_purchase_id }));
      }
      return json({ identity_verified: true, purchases: purchases.map((p: any) => ({ purchase_id: p.purchase_id, purchased_at: p.purchased_at })), fulfilments, configured: !!config?.product_id });
    }
    // Do not merge accounts by email. Require an existing, independently verified
    // Launch session and explicit account-link consent; existing auth stays intact.
    const launchToken = req.headers.get('x-launch-access-token');
    if (!launchToken || launchToken.length > 8192) return json({ error: 'launch_sign_in_required' }, 401);
    const db = admin();
    const { data: launch, error: authError } = await db.auth.getUser(launchToken);
    if (authError || !launch.user) return json({ error: 'launch_sign_in_required' }, 401);
    if (body.action === 'pilot-checkout') {
      const { data: link, error } = await db.from('rocket_identity_links').select('user_id').eq('rocket_subject', session.sub).eq('user_id', launch.user.id).maybeSingle();
      if (error || !link) return json({ error: 'explicit_identity_link_required' }, 403);
      const checkout = await rocket('launch-rocket-acceptance', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: authorization }, body: JSON.stringify({ action: 'checkout', confirm_purchase_terms: '39 USD one-time for one Launch Pro', amount_limit_cents: 3900 }) });
      // Only the authoritative controlled endpoint returns a hosted checkout.
      const url = new URL(checkout.checkout_url);
      if (url.origin !== 'https://checkout.stripe.com') throw new Error('invalid_checkout');
      return json({ checkout_url: url.toString() });
    }
    if (body.action === 'link') {
      if (body.confirm !== true) return json({ error: 'link_confirmation_required' }, 400);
      const { error } = await db.rpc('link_rocket_identity', { p_user_id: launch.user.id, p_subject: session.sub });
      if (error) return json({ error: 'identity_link_conflict' }, 409);
      return json({ linked: true });
    }
    if (!UUID.test(body.purchase_id) || !UUID.test(body.product_id)) return json({ error: 'invalid_purchase' }, 400);
    // Redirects, supplied prices, and local flags are never payment evidence.
    const purchase = purchases.find((p: any) => p.purchase_id === body.purchase_id);
    if (!purchase) return json({ error: 'verified_purchase_required' }, 403);
    const { data: orderId, error } = await db.rpc('fulfil_rocket_pro', {
      p_user_id: launch.user.id, p_subject: session.sub, p_purchase_id: purchase.purchase_id,
      p_rocket_product_id: purchase.product_id, p_product_id: body.product_id,
    });
    if (error) return json({ error: 'fulfilment_conflict' }, 409);
    return json({ fulfilled: true, order_id: orderId, product_id: body.product_id });
  } catch {
    // Never log OAuth codes, tokens, profiles, or provider response bodies.
    return json({ error: "verification_unavailable" }, 401);
  }
});
