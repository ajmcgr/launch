export const CLIENT_ID = "rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn";
export const APP_ID = "b202d75a-02ae-46e6-8419-5b3410cbaac8";
export const CALLBACK = "https://trylaunch.ai/rocket/callback";
export const ISSUER = "https://tryrocket.ai/connect";
export const ROCKET_API = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1";
export const AUTHORIZATION_ENDPOINT = "https://tryrocket.ai/connect/authorize";
export const OAUTH_SCOPE = "openid profile email entitlements:read";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const STATE = /^[A-Za-z0-9_-]{43}$/;

export type CanonicalProduct = {
  product_id: string | null;
  product_key: string | null;
  enabled: boolean;
};
type JsonRecord = Record<string, unknown>;
type RocketPurchase = JsonRecord & { purchase_id: string };

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

export function validReturnPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") &&
    !value.includes("\\") && value.length <= 1024;
}

export function validVerifiedEmail(profile: unknown, subject: string): string | null {
  const value = record(profile);
  if (!value || value.sub !== subject || value.email_verified !== true || typeof value.email !== "string") return null;
  const email = value.email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255 ? email : null;
}

export function isActiveOneTimePurchase(data: unknown, subject: string, product: CanonicalProduct | null): RocketPurchase[] {
  const response = record(data);
  if (!product?.enabled || !product.product_id || !product.product_key || !UUID.test(product.product_id) ||
    !subject || !response || response.sub !== subject || response.client_id !== CLIENT_ID || !Array.isArray(response.purchases)) return [];

  const seen = new Set<string>();
  const purchases = response.purchases.flatMap((value): RocketPurchase[] => {
    const purchase = record(value);
    if (!purchase || typeof purchase.purchase_id !== "string" || !UUID.test(purchase.purchase_id) ||
      purchase.client_id !== CLIENT_ID || purchase.product_id !== product.product_id || purchase.product_key !== product.product_key ||
      purchase.billing_type !== "one_time" || purchase.status !== "granted" || purchase.verified_paid !== true ||
      purchase.refunded === true || purchase.revoked === true || purchase.disputed === true || purchase.canceled === true) return [];
    return [purchase as RocketPurchase];
  });
  for (const purchase of purchases) {
    if (seen.has(purchase.purchase_id)) return [];
    seen.add(purchase.purchase_id);
  }
  return purchases;
}
