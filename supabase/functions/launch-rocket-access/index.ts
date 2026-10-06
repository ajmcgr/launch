import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.1.0";
import { CLIENT_ID, APP_ID, CALLBACK, ISSUER, ROCKET_API, hasAcceptanceAccess, isAcceptanceOffer } from "./rules.ts";

const jwks = createRemoteJWKSet(new URL(`${ROCKET_API}/rocket-connect-jwks`));
const headers = {
  "Access-Control-Allow-Origin": "https://trylaunch.ai",
  "Access-Control-Allow-Headers": "content-type,authorization,x-rocket-id-token",
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
      return json({ available: isAcceptanceOffer(catalog.plan, Deno.env.get("LAUNCH_ROCKET_ACCEPTANCE_PLAN_ID")), buy_url: `https://tryrocket.ai/apps/${APP_ID}` });
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
    if (!["status", "protected"].includes(body.action)) return json({ error: "invalid_action" }, 400);
    const authorization = req.headers.get("authorization") || "";
    const idToken = req.headers.get("x-rocket-id-token") || "";
    if (!/^Bearer [A-Za-z0-9_-]+$/.test(authorization) || !idToken || idToken.length > 8192) return json({ error: "sign_in_required" }, 401);
    const session = await identity(authorization.slice(7), idToken);
    const active = hasAcceptanceAccess(session.entitlements, session.sub, Deno.env.get("LAUNCH_ROCKET_ACCEPTANCE_PRODUCT_KEY"));
    if (body.action === "protected") return active ? json({ message: "Your new Buy with Rocket purchase unlocks this Launch acceptance area." }) : json({ error: "purchase_required" }, 403);
    return json({ active });
  } catch {
    // Never log OAuth codes, tokens, profiles, or provider response bodies.
    return json({ error: "verification_unavailable" }, 401);
  }
});
