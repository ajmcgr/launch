import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CAMPAIGN_SLUG } from '@/lib/campaign';

export interface BuilderWallProduct {
  id: string;
  name: string;
  tagline: string | null;
  slug: string;
  iconUrl?: string;
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
      const { data: categories } = await supabase
        .from('product_categories')
        .select('id, name');
      const categoryMap = new Map<number, string>(
        (categories || []).map((c: any) => [c.id, c.name])
      );

      let campaignRows: any[] = [];
      try {
        const { data, error } = await (supabase as any)
          .from('products')
          .select(PRODUCT_SELECT)
          .eq('status', 'launched')
          .eq('campaign', CAMPAIGN_SLUG)
          .order('launch_date', { ascending: false })
          .limit(limit);
        if (!error) campaignRows = data || [];
      } catch {
        // campaign column not present yet — fall back to recent launches only
      }

      const campaignProducts = mapRows(campaignRows, categoryMap, true);

      // Every launched product appears on the wall; campaign submissions come first.
      const { data: recentRows } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('status', 'launched')
        .order('launch_date', { ascending: false })
        .limit(limit * 2);

      const seen = new Set(campaignProducts.map((p) => p.id));
      const filler = mapRows(recentRows || [], categoryMap, false).filter(
        (p) => !seen.has(p.id)
      );

      return [...campaignProducts, ...filler].slice(0, limit);
    },
    staleTime: 5 * 60 * 1000,
  });
