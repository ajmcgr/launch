import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface SponsoredItem {
  key: string;
  adType: 'product' | 'custom';
  href: string;
  external: boolean;
  name: string;
  tagline: string;
  iconUrl?: string;
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
        .in('sponsorship_type', ['website', 'combined'])
        .order('position', { ascending: true })
        .limit(2);

      if (data && data.length > 0) {
        const items: SponsoredItem[] = data
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
            };
          })
          .filter((x: SponsoredItem | null): x is SponsoredItem => x !== null);
        setSponsored(items);
      }
    };

    fetchSponsored();
  }, []);

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
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0 text-muted-foreground border-muted-foreground/30">
                    Ad
                  </Badge>
                </div>
                {item.tagline && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                    {item.tagline}
                  </p>
                )}
              </div>
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
