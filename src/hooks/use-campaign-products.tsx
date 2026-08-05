import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CAMPAIGN_SLUG } from '@/lib/campaign';

export interface BuilderWallProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  iconUrl?: string;
  screenshotUrl?: string;
  category?: string;
  founder?: string;
  isCampaign: boolean;
}

const PRODUCT_SELECT = `
  id, name, tagline, slug, launch_date,
  product_media(url, type),
  product_category_map(category_id),
  product_makers(user_id, users(username))
`;

const mapRows = (rows: any[], categoryMap: Map<number, string>, isCampaign: boolean): BuilderWallProduct[] =>
  rows
    .filter((p) => p.name && p.slug)
    .map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      slug: p.slug,
      iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
      screenshotUrl:
        p.product_media?.find((m: any) => m.type === 'screenshot')?.url ||
        p.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
      category: p.product_category_map
        ?.map((c: any) => categoryMap.get(c.category_id))
        .filter(Boolean)[0],
      founder: (p.product_makers || [])
        .map((pm: any) => pm.users?.username)
        .filter(Boolean)[0],
      isCampaign,
    }));

/**
 * Products shown on the Builder Wall.
 *
 * Campaign submissions come first. Until there are enough of them the wall is
 * topped up with real, recently launched Launch products — never fake ones.
 */
export const useCampaignProducts = (limit = 32) =>
  useQuery({
    queryKey: ['builder-wall', limit],
    queryFn: async (): Promise<BuilderWallProduct[]> => {
      const PAGE = limit > 0 ? limit : 500;

      // Categories and campaign products fetch in parallel with the first page
      // of recent launches — no waterfall.
      const campaignQuery = (supabase as any)
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'launched')
        .eq('campaign', CAMPAIGN_SLUG)
        .order('launch_date', { ascending: false })
        .limit(PAGE);

      const recentQuery = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'launched')
        .order('launch_date', { ascending: false })
        .limit(PAGE);

      const [categoriesRes, campaignRes, recentRes] = await Promise.all([
        supabase.from('product_categories').select('id, name'),
        campaignQuery.then((r: any) => r).catch(() => ({ data: [], error: null })),
        recentQuery,
      ]);

      const categoryMap = new Map<number, string>(
        ((categoriesRes.data as any[]) || []).map((c: any) => [c.id, c.name])
      );

      const campaignProducts = mapRows(
        (campaignRes as any)?.error ? [] : ((campaignRes as any)?.data || []),
        categoryMap,
        true
      );

      const recentRows: any[] = recentRes.data || [];
      const seenIds = new Set<string>(recentRows.map((r: any) => r.id));

      // Only page further when the caller asked for everything (limit = 0).
      if (limit === 0 && recentRows.length === PAGE) {
        let cursor: string | null = (recentRows[recentRows.length - 1] as any).launch_date;
        for (let page = 0; page < 19; page++) {
          let q = supabase
            .from('products')
            .select(PRODUCT_SELECT)
            .eq('status', 'launched')
            .order('launch_date', { ascending: false })
            .limit(PAGE);
          if (cursor) q = q.lt('launch_date', cursor);
          const { data, error } = await q;
          if (error || !data?.length) break;
          const fresh = data.filter((r: any) => !seenIds.has(r.id));
          fresh.forEach((r: any) => seenIds.add(r.id));
          recentRows.push(...fresh);
          const nextCursor = (data[data.length - 1] as any).launch_date;
          if (!nextCursor || nextCursor === cursor || data.length < PAGE) break;
          cursor = nextCursor;
        }
      }

      const seen = new Set(campaignProducts.map((p) => p.id));
      const filler = mapRows(recentRows, categoryMap, false).filter((p) => !seen.has(p.id));

      const all = [...campaignProducts, ...filler];
      return limit > 0 ? all.slice(0, limit) : all;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

/** Cheap head-count of launched products (no row payload). */
export const useLaunchedProductCount = () =>
  useQuery({
    queryKey: ['launched-product-count'],
    queryFn: async (): Promise<number> => {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'launched');
      return count || 0;
    },
    staleTime: 30 * 60 * 1000,
  });
