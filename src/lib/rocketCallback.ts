export type PendingLogin = { state: string; nonce: string; verifier: string; created_at: number };
export function validCallback(pending: PendingLogin | null, state: string | null, now = Date.now()) {
  return !!pending && typeof state === "string" && state === pending.state &&
    /^[A-Za-z0-9_-]{43}$/.test(pending.state) && /^[A-Za-z0-9_-]{43}$/.test(pending.nonce) &&
    /^[A-Za-z0-9_-]{43}$/.test(pending.verifier) && Number.isFinite(pending.created_at) &&
    pending.created_at <= now && now - pending.created_at < 600000;
}
