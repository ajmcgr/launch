import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import AdvertiseCTA from '@/components/AdvertiseCTA';
import { weightedPick } from '@/lib/weightedPick';

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
        placement: 'inline',
      },
    } as any);
  } catch {}
};

const InlineAdSlot = () => {
  const [sponsored, setSponsored] = useState<SponsoredItem | null>(null);
  const [loading, setLoading] = useState(true);

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
        // Weighted rotation: ads with higher `weight` are more likely to appear.
        const s: any = weightedPick(data as any[]);
        if (!s) { setLoading(false); return; }
        if (s.ad_type === 'custom' && s.custom_target_url) {
          setSponsored({
            key: s.id,
            adType: 'custom',
            href: s.custom_target_url,
            external: true,
            name: s.custom_title || 'Ad',
            tagline: s.custom_description || '',
            iconUrl: s.custom_image_url || undefined,
          });
        } else if (s.products) {
          const p = s.products;
          const icon = p.product_media?.find((m: any) => m.type === 'icon')?.url;
          setSponsored({
            key: s.id,
            adType: 'product',
            href: `/launch/${p.slug}`,
            external: false,
            name: p.name,
            tagline: p.tagline,
            iconUrl: icon,
          });
        }
      }
      setLoading(false);
    };

    fetchSponsored();
  }, []);

  if (loading) return null;
  if (!sponsored) {
    return <AdvertiseCTA className="rounded-lg" />;
  }

  const inner = (
    <>
      {sponsored.iconUrl ? (
        <img
          src={sponsored.iconUrl}
          alt={sponsored.name}
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-base font-bold text-muted-foreground">
          {sponsored.name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {sponsored.name}
          </p>
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
            Ad
          </span>
        </div>
        {sponsored.tagline && (
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
            {sponsored.tagline}
          </p>
        )}
      </div>
    </>
  );
  const cls = 'flex items-center gap-4 p-5 rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors group';

  return sponsored.external ? (
    <a
      href={sponsored.href}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      onClick={() => trackAdClick(sponsored)}
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <Link to={sponsored.href} onClick={() => trackAdClick(sponsored)} className={cls}>
      {inner}
    </Link>
  );
};

export default InlineAdSlot;
