import { supabase } from '@/integrations/supabase/client';

const sb: any = supabase;

export interface CollectionItemRow {
  collection_id: string;
  product_id: string;
  added_at?: string | null;
}

/**
 * Given collection item rows, resolve a cover image per collection using the
 * most recently added product's screenshot (falling back to its icon).
 * Returns a map of collection_id -> image url.
 */
export async function fetchLatestProductCovers(
  rows: CollectionItemRow[],
): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (!rows?.length) return covers;

  // Latest item per collection
  const latest = new Map<string, CollectionItemRow>();
  rows.forEach((r) => {
    if (!r?.product_id) return;
    const current = latest.get(r.collection_id);
    if (!current) { latest.set(r.collection_id, r); return; }
    const a = r.added_at ? Date.parse(r.added_at) : 0;
    const b = current.added_at ? Date.parse(current.added_at) : 0;
    if (a >= b) latest.set(r.collection_id, r);
  });

  const productIds = Array.from(new Set(Array.from(latest.values()).map((r) => r.product_id)));
  if (!productIds.length) return covers;

  // Chunk to keep .in() lists reasonable
  const media: any[] = [];
  for (let i = 0; i < productIds.length; i += 200) {
    const chunk = productIds.slice(i, i + 200);
    const { data } = await sb
      .from('product_media')
      .select('product_id, type, url')
      .in('product_id', chunk)
      .in('type', ['screenshot', 'icon'])
      .range(0, 4999);
    if (data) media.push(...data);
  }

  const shots = new Map<string, string>();
  const icons = new Map<string, string>();
  media.forEach((m) => {
    if (!m?.url) return;
    if (m.type === 'screenshot' && !shots.has(m.product_id)) shots.set(m.product_id, m.url);
    if (m.type === 'icon' && !icons.has(m.product_id)) icons.set(m.product_id, m.url);
  });

  latest.forEach((row, collectionId) => {
    const url = shots.get(row.product_id) || icons.get(row.product_id);
    if (url) covers.set(collectionId, url);
  });

  return covers;
}
