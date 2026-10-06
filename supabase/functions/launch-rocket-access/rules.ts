export const CLIENT_ID = "rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn";
export const APP_ID = "b202d75a-02ae-46e6-8419-5b3410cbaac8";
export const CALLBACK = "https://trylaunch.ai/rocket/callback";
export const ISSUER = "https://tryrocket.ai/connect";
export const ROCKET_API = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1";

export function hasAcceptanceAccess(data: unknown, sub: string, productKey: string | undefined, now = Date.now()): boolean {
  if (!productKey || !sub || !data || typeof data !== "object") return false;
  const result = data as Record<string, unknown>;
  if (result.sub !== sub || result.client_id !== CLIENT_ID || !Array.isArray(result.entitlements)) return false;
  const matches = result.entitlements.filter(e => e?.product_key === productKey);
  if (matches.length !== 1) return false;
  const e = matches[0];
  return e.active === true && ["active", "canceling"].includes(e.status) &&
    typeof e.valid_until === "string" && Number.isFinite(Date.parse(e.valid_until)) && Date.parse(e.valid_until) > now;
}

export function isAcceptanceOffer(plan: unknown, expectedPlanId: string | undefined): boolean {
  if (!expectedPlanId || !plan || typeof plan !== "object") return false;
  const p = plan as Record<string, unknown>;
  return p.id === expectedPlanId && p.amount_cents === 100 && p.currency === "usd" && p.interval === "month";
}
