import { supabase } from '@/integrations/supabase/client';

const PENDING_KEY = 'launch:rocket:test:pending';
const PURCHASE_KEY = 'launch:rocket:test:purchase';
const STATE = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RocketTestStatus = {
  connected: boolean;
  buy_available: boolean;
  purchases: Array<{ purchase_id: string }>;
  fulfilments: Array<{ id: string; purchase_id: string; launch_product_id: string }>;
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('launch-rocket-test-access', { body });
  if (error || !data || data.error) throw new Error(data?.error || 'The Rocket test flow is unavailable.');
  return data;
}

export async function startRocketTest() {
  const response = await invoke({ action: 'start' });
  if (typeof response.state !== 'string' || !STATE.test(response.state) ||
      typeof response.authorization_url !== 'string') throw new Error('Rocket test sign-in is unavailable.');
  const authorization = new URL(response.authorization_url);
  if (authorization.origin !== 'https://tryrocket.ai' || authorization.pathname !== '/connect/authorize')
    throw new Error('Invalid Rocket authorization destination.');
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: response.state, created_at: Date.now() }));
  window.location.assign(authorization.toString());
}

export async function completeRocketTest(query: string) {
  const params = new URLSearchParams(query);
  let pending: { state?: string; created_at?: number } | null = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { /* reject below */ }
  sessionStorage.removeItem(PENDING_KEY);
  const state = params.get('state');
  const code = params.get('code');
  if (params.has('error') || !state || !STATE.test(state) || !code ||
      pending?.state !== state || typeof pending.created_at !== 'number' ||
      Date.now() - pending.created_at > 10 * 60_000 || pending.created_at > Date.now())
    throw new Error('Rocket test sign-in was not completed. Start again from this browser.');
  await invoke({ action: 'complete', state, code });
}

export async function rocketTestStatus(): Promise<RocketTestStatus> {
  return await invoke({ action: 'status' }) as RocketTestStatus;
}

export async function buyRocketTest(launchProductId: string) {
  if (!UUID.test(launchProductId)) throw new Error('Select a valid unpaid draft.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to Launch first.');
  const key = `${PURCHASE_KEY}:${user.id}:${launchProductId}`;
  let requestId = localStorage.getItem(key);
  if (!requestId) { requestId = crypto.randomUUID(); localStorage.setItem(key, requestId); }
  const response = await invoke({ action: 'buy', launch_product_id: launchProductId, purchase_request_id: requestId });
  if (typeof response.checkout_url !== 'string') throw new Error('Rocket test checkout is unavailable.');
  const checkout = new URL(response.checkout_url);
  if (checkout.origin !== 'https://checkout.stripe.com') throw new Error('Invalid test checkout destination.');
  localStorage.setItem('launch:rocket:test:pending-purchase', launchProductId);
  window.location.assign(checkout.toString());
}

export async function fulfilRocketTest(launchProductId: string, purchaseId: string) {
  if (!UUID.test(launchProductId) || !UUID.test(purchaseId)) throw new Error('Invalid test purchase.');
  return await invoke({ action: 'fulfil', launch_product_id: launchProductId, purchase_id: purchaseId }) as { fulfilment_id: string };
}
