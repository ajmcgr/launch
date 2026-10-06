const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-rocket-access`;
export const PENDING_KEY = "launch:rocket:pending";
export const SESSION_KEY = "launch:rocket:session";
type RocketSession = { access_token: string; id_token: string; expires_at: number };
export { validCallback } from "./rocketCallback";
import { validCallback, type PendingLogin } from "./rocketCallback";
export function readSession(): RocketSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (value && typeof value.access_token === "string" && typeof value.id_token === "string" && value.expires_at > Date.now()) return value;
  } catch { /* Invalid or expired sessions require a new Rocket sign-in. */ }
  sessionStorage.removeItem(SESSION_KEY);
  return null;
}
export async function rocketRequest(action: string, body = {}, authenticated = false) {
  const session = authenticated ? readSession() : null;
  if (authenticated && !session) throw new Error("Please continue with Rocket again.");
  const response = await fetch(ENDPOINT, {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}`, "X-Rocket-ID-Token": session.id_token } : {}) },
    body: JSON.stringify({ ...body, action }),
  });
  if (!response.ok) throw new Error("We could not verify your Rocket access. Please try again.");
  return response.json();
}
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function startRocketLogin() {
  const config = await rocketRequest("config");
  const pending = { state: random(), nonce: random(), verifier: random(), created_at: Date.now() };
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pending.verifier))));
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const url = new URL(config.authorization_endpoint);
  url.search = new URLSearchParams({ client_id: config.client_id, redirect_uri: config.callback, response_type: "code", scope: config.scope, state: pending.state, nonce: pending.nonce, code_challenge: challenge, code_challenge_method: "S256" }).toString();
  window.location.assign(url.toString());
}
export async function completeRocketLogin(query: string) {
  const params = new URLSearchParams(query);
  let pending: PendingLogin | null = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); } catch { /* Reject malformed state. */ }
  // Consume state before any asynchronous work to prevent callback replay.
  sessionStorage.removeItem(PENDING_KEY);
  if (params.has("error") || !params.get("code") || !validCallback(pending, params.get("state"))) throw new Error("Rocket sign-in was not completed. Please start again.");
  const tokens = await rocketRequest("complete", { code: params.get("code"), verifier: pending!.verifier, nonce: pending!.nonce });
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ access_token: tokens.access_token, id_token: tokens.id_token, expires_at: Date.now() + tokens.expires_in * 1000 }));
}
export function signOutRocket() { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(PENDING_KEY); sessionStorage.removeItem("launch:rocket:callback"); }
