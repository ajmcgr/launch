import { supabase } from '@/integrations/supabase/client';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-rocket-access`;
const PENDING_KEY = 'launch:rocket:pending';
const PENDING_COOKIE = 'launch_rocket_pending';
const STATE = /^[A-Za-z0-9_-]{43}$/;
const MAX_PENDING_ATTEMPTS = 3;
const PENDING_TTL_MS = 10 * 60_000;

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

function isCurrentPending(value: unknown): value is PendingLogin {
  return typeof value === 'object' && value !== null &&
    typeof (value as PendingLogin).state === 'string' && STATE.test((value as PendingLogin).state) &&
    typeof (value as PendingLogin).created_at === 'number' &&
    Number.isFinite((value as PendingLogin).created_at) &&
    (value as PendingLogin).created_at <= Date.now() && Date.now() - (value as PendingLogin).created_at < PENDING_TTL_MS;
}

function readPendingStorage(): PendingLogin[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) || '[]');
    // Accept the original single-record format for an in-flight sign-in during rollout.
    const values = Array.isArray(parsed) ? parsed : [parsed];
    return values.filter(isCurrentPending);
  } catch {
    return [];
  }
}

function readPendingCookie(): PendingLogin[] {
  const encoded = document.cookie.split('; ').find((item) => item.startsWith(`${PENDING_COOKIE}=`))?.slice(PENDING_COOKIE.length + 1);
  if (!encoded) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
    return Array.isArray(parsed) ? parsed.filter(isCurrentPending) : [];
  } catch {
    return [];
  }
}

function savePending(attempts: PendingLogin[]) {
  const current = attempts.filter(isCurrentPending).slice(-MAX_PENDING_ATTEMPTS);
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(current)); } catch { /* cookie remains a same-origin fallback */ }
  document.cookie = `${PENDING_COOKIE}=${encodeURIComponent(JSON.stringify(current))}; Path=/rocket; Max-Age=${PENDING_TTL_MS / 1000}; SameSite=Lax; Secure`;
}

function rememberPending(attempt: PendingLogin) {
  // Keep a small, short-lived set so an accidental second click or a new tab
  // cannot invalidate an otherwise valid in-progress authorization response.
  const attempts = [...readPendingStorage(), ...readPendingCookie()]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.state === item.state) === index)
    .filter((item) => item.state !== attempt.state);
  savePending([...attempts, attempt]);
}

function takePending(state: string) {
  const attempts = [...readPendingStorage(), ...readPendingCookie()]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.state === item.state) === index);
  const pending = attempts.find((item) => item.state === state) || null;
  savePending(attempts.filter((item) => item.state !== state));
  return pending;
}

export async function startRocketLogin(returnPath = currentPath()) {
  const response = await request({ action: 'start', return_path: returnPath });
  if (typeof response?.state !== 'string' || !STATE.test(response.state) || typeof response?.authorization_url !== 'string') {
    throw new Error('Rocket sign-in is unavailable.');
  }
  rememberPending({ state: response.state, created_at: Date.now() });
  window.location.assign(response.authorization_url);
}

export async function completeRocketLogin(query: string) {
  const params = new URLSearchParams(query);
  const state = params.get('state');
  const code = params.get('code');
  const pending = state && STATE.test(state) ? takePending(state) : null;
  if (params.has('error') || !pending || !code || !state) {
    throw new Error('Rocket sign-in was not completed. Please start again from this browser.');
  }
  const response = await request({ action: 'complete', code, state });
  if (typeof response?.email !== 'string' || typeof response?.token_hash !== 'string') throw new Error('Rocket sign-in could not create a Launch session.');
  // Hash verification is a separate Supabase API shape from email + OTP.
  // Including email with token_hash causes Auth to reject the session exchange.
  const { error } = await supabase.auth.verifyOtp({ token_hash: response.token_hash, type: 'magiclink' });
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
