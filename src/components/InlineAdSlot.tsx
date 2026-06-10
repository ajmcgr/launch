import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import AdvertiseCTA from '@/components/AdvertiseCTA';

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
        .order('position', { ascending: true });

      if (data && data.length > 0) {
        // Rotate: pick a random active ad per page load so all partners get exposure
        const s: any = data[Math.floor(Math.random() * data.length)];
        if (s.ad_type === 'custom' && s.custom_target_url) {
          setSponsored({
            key: s.id,
            adType: 'custom',
            href: s.custom_target_url,
            external: true,
            name: s.custom_title || 'Sponsored',
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
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0 text-muted-foreground border-muted-foreground/30">
            Sponsored
          </Badge>
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
