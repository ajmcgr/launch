export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const STATE = /^[A-Za-z0-9_-]{43}$/;
export const CALLBACK = "https://trylaunch.ai/rocket/test/callback";
export const RETURN_URI = "https://trylaunch.ai/my-products";
export const ISSUER = "https://tryrocket.ai/connect";
export const AUTHORIZATION_ENDPOINT = "https://tryrocket.ai/connect/authorize";
export const ROCKET_API = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;

export function verifiedTestPurchases(
  response: unknown,
  subject: string,
  config: { client_id: string; product_id: string; product_key: string; enabled: boolean },
) {
  const result = record(response);
  if (!config.enabled || !UUID.test(config.product_id) || !result ||
      result.sub !== subject || result.client_id !== config.client_id || !Array.isArray(result.purchases)) return [];
  const seen = new Set<string>();
  const accepted: Array<{ purchase_id: string }> = [];
  for (const value of result.purchases) {
    const purchase = record(value);
    if (!purchase || typeof purchase.purchase_id !== "string" || !UUID.test(purchase.purchase_id) ||
        purchase.client_id !== config.client_id || purchase.product_id !== config.product_id ||
        purchase.product_key !== config.product_key || purchase.environment !== "test" ||
        purchase.billing_type !== "one_time" || purchase.status !== "granted" ||
        purchase.verified_paid !== true || purchase.amount_cents !== 3900 ||
        purchase.application_fee_cents !== 195 ||
        purchase.currency !== "usd" || purchase.quantity !== 1 ||
        purchase.refunded === true || purchase.revoked === true || purchase.disputed === true ||
        purchase.canceled === true ||
        (purchase.valid_until != null &&
          (typeof purchase.valid_until !== "string" ||
           !Number.isFinite(Date.parse(purchase.valid_until)) ||
           Date.parse(purchase.valid_until) <= Date.now())) ||
        seen.has(purchase.purchase_id)) return [];
    seen.add(purchase.purchase_id);
    accepted.push({ purchase_id: purchase.purchase_id });
  }
  return accepted;
}
