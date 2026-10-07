export const CLIENT_ID = "rocket-dev-fZfbAEjB3Kp_eroMLQ_y4_fn";
export const APP_ID = "b202d75a-02ae-46e6-8419-5b3410cbaac8";
export const CALLBACK = "https://trylaunch.ai/rocket/callback";
export const ISSUER = "https://tryrocket.ai/connect";
export const ROCKET_API = "https://lcujmvdgczkjxdstzhnr.supabase.co/functions/v1";

export const PAYMENT_RETURN = "https://trylaunch.ai/my-products?success=true";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type CanonicalProduct = { product_id: string | null; product_key: string | null };
export function verifiedPurchases(data: any, sub: string, product: CanonicalProduct | null) {
  if (!product?.product_id || !product.product_key || !UUID.test(product.product_id) || !sub || data?.sub !== sub || data.client_id !== CLIENT_ID || !Array.isArray(data.purchases)) return [];
  const seen = new Set<string>();
  const matches = data.purchases.filter((p: any) => UUID.test(p.purchase_id) && p.client_id === CLIENT_ID &&
    p.product_id === product.product_id && p.product_key === product.product_key && p.environment === 'production' &&
    p.billing_type === 'one_time' && p.quantity === 1 && p.status === 'granted' && p.verified_paid === true &&
    p.amount_cents === 3900 && p.currency === 'usd' && p.application_fee_cents === 195);
  for (const p of matches) { if (seen.has(p.purchase_id)) return []; seen.add(p.purchase_id); }
  return matches;
}
export function isProOffer(plan: any, product: CanonicalProduct | null): boolean {
  return !!product?.product_id && !!product.product_key && plan?.id === product.product_id &&
    plan.amount_cents === 3900 && plan.currency === 'usd' && plan.billing_type === 'one_time' && plan.interval === null;
}
