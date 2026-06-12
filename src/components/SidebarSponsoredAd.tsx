import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { weightedShuffle } from '@/lib/weightedPick';
import { toast } from 'sonner';



interface SponsoredItem {
  key: string;
  adType: 'product' | 'custom';
  href: string;
  external: boolean;
  name: string;
  tagline: string;
  iconUrl?: string;
  productId?: string;
  netVotes?: number;
  userVote?: 1 | null;
}

const trackAdClick = (item: SponsoredItem) => {
  try {
    supabase.from('product_analytics').insert({
      event_type: 'ad_click',
      metadata: {
        ad_type: item.adType,
        ad_id: item.key,
        target_url: item.href,
        placement: 'sidebar',
      },
    } as any);
  } catch {}
};

const SidebarSponsoredAd = () => {
  const [sponsored, setSponsored] = useState<SponsoredItem[]>([]);

  useEffect(() => {
    const fetchSponsored = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sponsored_products')
        .select(`
          id,
          ad_type,
          weight,
          product_id,
          custom_image_url,
          custom_title,
          custom_description,
          custom_target_url,
          products(
            id,
            slug,
            name,
            tagline,
            product_media(url, type)
          )
        `)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('sponsorship_type', ['website', 'combined']);

      if (data && data.length > 0) {
        // Weighted shuffle across ALL active ads, then take 2.
        const shuffled = weightedShuffle(data as any[]).slice(0, 2);
        let items: SponsoredItem[] = shuffled
          .map((s: any): SponsoredItem | null => {
            if (s.ad_type === 'custom' && s.custom_target_url) {
              return {
                key: s.id,
                adType: 'custom',
                href: s.custom_target_url,
                external: true,
                name: s.custom_title || 'Ad',
                tagline: s.custom_description || '',
                iconUrl: s.custom_image_url || undefined,
              };
            }
            const p = s.products;
            if (!p) return null;
            const icon = p.product_media?.find((m: any) => m.type === 'icon')?.url;
            return {
              key: s.id,
              adType: 'product',
              href: `/launch/${p.slug}`,
              external: false,
              name: p.name,
              tagline: p.tagline,
              iconUrl: icon,
              productId: p.id,
            };
          })
          .filter((x: SponsoredItem | null): x is SponsoredItem => x !== null);

        // Fetch vote counts + current user's votes for product-type ads
        const productIds = items.map((i) => i.productId).filter(Boolean) as string[];
        if (productIds.length) {
          const { data: { user } } = await supabase.auth.getUser();
          const [counts, myVotes] = await Promise.all([
            supabase.from('product_vote_counts').select('product_id, net_votes').in('product_id', productIds),
            user
              ? supabase.from('votes').select('product_id').eq('user_id', user.id).eq('value', 1).in('product_id', productIds)
              : Promise.resolve({ data: [] as any[] }),
          ]);
          const cMap = new Map<string, number>(((counts.data as any[]) || []).map((v) => [v.product_id, v.net_votes || 0]));
          const vMap = new Set<string>(((myVotes.data as any[]) || []).map((v) => v.product_id));
          items = items.map((i) => i.productId
            ? { ...i, netVotes: cMap.get(i.productId) || 0, userVote: vMap.has(i.productId) ? 1 : null }
            : i);
        }

        setSponsored(items);
      }
    };

    fetchSponsored();
  }, []);

  const handleVote = async (item: SponsoredItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.productId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast('Sign up to upvote', {
        action: { label: 'Sign up', onClick: () => { window.location.href = '/auth?signup=true'; } },
      });
      return;
    }
    const wasVoted = item.userVote === 1;
    // Optimistic
    setSponsored((prev) => prev.map((i) => i.key === item.key
      ? { ...i, userVote: wasVoted ? null : 1, netVotes: Math.max(0, (i.netVotes || 0) + (wasVoted ? -1 : 1)) }
      : i));
    try {
      const { data: existing } = await supabase
        .from('votes').select('id, value')
        .eq('product_id', item.productId).eq('user_id', user.id).maybeSingle();
      if (existing) {
        if (existing.value === 1) {
          await supabase.from('votes').delete().eq('id', existing.id);
        } else {
          await supabase.from('votes').update({ value: 1 }).eq('id', existing.id);
        }
      } else {
        await supabase.from('votes').insert({ product_id: item.productId, user_id: user.id, value: 1 });
      }
    } catch (err) {
      // Revert
      setSponsored((prev) => prev.map((i) => i.key === item.key
        ? { ...i, userVote: wasVoted ? 1 : null, netVotes: Math.max(0, (i.netVotes || 0) + (wasVoted ? 1 : -1)) }
        : i));
      toast.error('Failed to vote');
    }
  };

  if (sponsored.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ad</h3>
      </div>
      <div className="space-y-2">
        {sponsored.map((item) => {
          const inner = (
            <>
              {item.iconUrl ? (
                <img
                  src={item.iconUrl}
                  alt={item.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                  {item.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {item.name}
                  </p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                    Ad
                  </span>
                </div>
                {item.tagline && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {item.tagline}
                  </p>
                )}
              </div>
              {item.adType === 'product' && (
                <button
                  type="button"
                  onClick={(e) => handleVote(item, e)}
                  className={`flex flex-col items-center justify-center gap-0.5 h-10 w-10 rounded-md border-2 transition-colors flex-shrink-0 ${
                    item.userVote === 1
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground/20 hover:border-primary hover:text-primary'
                  }`}
                  aria-label={`Upvote ${item.name}`}
                >
                  <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold leading-none">{Math.max(0, item.netVotes || 0)}</span>
                </button>
              )}
            </>
          );
          const cls = 'flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group';
          return item.external ? (
            <a
              key={item.key}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              onClick={() => trackAdClick(item)}
              className={cls}
            >
              {inner}
            </a>
          ) : (
            <Link key={item.key} to={item.href} onClick={() => trackAdClick(item)} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default SidebarSponsoredAd;
