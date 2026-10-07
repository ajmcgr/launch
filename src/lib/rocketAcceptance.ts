import { supabase } from '@/integrations/supabase/client';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-rocket-access`;
const PENDING_KEY = 'launch:rocket:pending';
const STATE = /^[A-Za-z0-9_-]{43}$/;

type PendingLogin = { state: string; created_at: number };

async function request(body: Record<string, unknown>) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Rocket sign-in could not be verified. Please try again.');
  return response.json();
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export async function startRocketLogin(returnPath = currentPath()) {
  const response = await request({ action: 'start', return_path: returnPath });
  if (typeof response?.state !== 'string' || !STATE.test(response.state) || typeof response?.authorization_url !== 'string') {
    throw new Error('Rocket sign-in is unavailable.');
  }
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: response.state, created_at: Date.now() } satisfies PendingLogin));
  window.location.assign(response.authorization_url);
}

export async function completeRocketLogin(query: string) {
  const params = new URLSearchParams(query);
  let pending: PendingLogin | null = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch { /* reject malformed state */ }
  sessionStorage.removeItem(PENDING_KEY);
  const state = params.get('state');
  const code = params.get('code');
  if (params.has('error') || !pending || !code || !state || state !== pending.state || !STATE.test(state) ||
    !Number.isFinite(pending.created_at) || pending.created_at > Date.now() || Date.now() - pending.created_at >= 10 * 60_000) {
    throw new Error('Rocket sign-in was not completed. Please start again from this browser.');
  }
  const response = await request({ action: 'complete', code, state });
  if (typeof response?.email !== 'string' || typeof response?.token_hash !== 'string') throw new Error('Rocket sign-in could not create a Launch session.');
  const { error } = await supabase.auth.verifyOtp({ email: response.email, token_hash: response.token_hash, type: 'magiclink' });
  if (error) throw error;
  return typeof response.return_path === 'string' && response.return_path.startsWith('/') && !response.return_path.startsWith('//')
    ? response.return_path
    : '/';
}

export async function rocketStatus() {
  const { data, error } = await supabase.functions.invoke('launch-rocket-access', { body: { action: 'status' } });
  if (error) throw new Error('Rocket access could not be verified. Please continue with Rocket again.');
  return data as { connected: boolean; reauth_required: boolean; purchases: Array<{ purchase_id: string }>; buy_available: boolean };
}
