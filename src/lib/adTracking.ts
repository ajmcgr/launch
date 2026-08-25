import { supabase } from '@/integrations/supabase/client';

// Shared, minimal impression/click tracking for sponsored ads
// (both product ads and custom banner/text ads live in sponsored_products).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dedupe impressions per page session (module-level: survives rerenders,
// resets on full page load).
const seenImpressions = new Set<string>();

export const trackAdImpression = (adId: string, placement = 'unknown') => {
  if (!adId || !UUID_RE.test(adId)) return;
  const key = `${adId}:${placement}`;
  if (seenImpressions.has(key)) return;
  seenImpressions.add(key);
  try {
    void (supabase.rpc as any)('increment_ad_impression', { ad_id: adId });
  } catch {}
};

export const trackAdClickCount = (adId: string) => {
  if (!adId || !UUID_RE.test(adId)) return;
  try {
    void (supabase.rpc as any)('increment_ad_click', { ad_id: adId });
  } catch {}
};

export const formatCtr = (clicks?: number | null, impressions?: number | null) => {
  const i = impressions || 0;
  const c = clicks || 0;
  if (i <= 0) return '0.00%';
  return `${((c / i) * 100).toFixed(2)}%`;
};
