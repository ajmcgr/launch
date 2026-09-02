const KEY = 'launchSchedulerHeartbeat';
const INTERVAL_MS = 10 * 60 * 1000; // at most once every 10 minutes per browser

/**
 * Fallback trigger for the scheduled-launch sweep.
 *
 * pg_cron has silently stopped firing more than once (schema resets, secret
 * drift), leaving paid launches stuck in `scheduled`. The edge function is
 * idempotent — it only promotes products whose launch_date has already passed —
 * so pinging it from the app guarantees launches go live even if cron is down.
 */
export function pingLaunchScheduler() {
  try {
    const last = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - last < INTERVAL_MS) return;
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // localStorage unavailable — still ping once
  }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-scheduler`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    keepalive: true,
  }).catch(() => {
    /* best-effort */
  });
}
