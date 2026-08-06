import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { weightedShuffle } from '@/lib/weightedPick';

interface RailAd {
  key: string;
  adType: 'product' | 'custom';
  href: string;
  external: boolean;
  name: string;
  tagline: string;
  iconUrl?: string;
}

const SLOTS_PER_SIDE = 5;

const trackAdClick = (item: RailAd, placement: string) => {
  try {
    supabase.from('product_analytics').insert({
      event_type: 'ad_click',
      metadata: {
        ad_type: item.adType,
        ad_id: item.key,
        target_url: item.href,
        placement,
      },
    } as any);
  } catch {}
};

const AdTile = ({ item, placement }: { item: RailAd; placement: string }) => {
  const inner = (
    <>
      <div className="h-10 w-full flex items-center justify-center overflow-hidden mb-2 shrink-0">
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
            alt={item.name}
            loading="lazy"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">{item.name[0]}</span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
        {item.name}
      </p>
      {item.tagline && (
        <p className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
          {item.tagline}
        </p>
      )}
    </>
  );

  const cls =
    'flex flex-col justify-center min-h-[132px] overflow-hidden rounded-xl border border-border bg-card p-2.5 hover:border-foreground/20 hover:shadow-sm transition-all group';

  return item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      onClick={() => trackAdClick(item, placement)}
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <Link to={item.href} onClick={() => trackAdClick(item, placement)} className={cls}>
      {inner}
    </Link>
  );
};

const PlaceholderTile = () => (
  <Link
    to="/advertise"
    className="flex flex-col justify-center min-h-[132px] overflow-hidden rounded-xl border border-dashed border-border bg-muted/10 p-2.5 hover:border-foreground/25 hover:bg-muted/20 transition-all group"
  >
    <div className="h-10 w-full rounded-lg bg-muted/20 flex items-center justify-center mb-2 shrink-0">
      <span className="text-lg font-light text-muted-foreground group-hover:text-foreground transition-colors">
        +
      </span>
    </div>
    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
      Your ad here
    </p>
    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
      Reach vibe coders launching every day.
    </p>
  </Link>
);

const Rail = ({
  ads,
  side,
  isCampaign,
  reserveLast,
}: {
  ads: RailAd[];
  side: 'left' | 'right';
  isCampaign?: boolean;
  reserveLast?: boolean;
}) => {
  // The final tile of the last rail always stays empty as an "advertise here" slot.
  const usable = reserveLast ? SLOTS_PER_SIDE - 1 : SLOTS_PER_SIDE;
  return (
    <aside
      aria-label={`${side} sponsored`}
      className={`hidden min-[1700px]:flex flex-col fixed ${isCampaign ? 'top-20' : 'top-28'} bottom-4 ${side === 'left' ? 'left-4' : 'right-4'} w-[180px] z-10`}
    >
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 leading-5 flex-shrink-0">
        Ad
      </h3>
      <div className="flex flex-col gap-2 overflow-y-auto pb-2 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: SLOTS_PER_SIDE }).map((_, i) => (
          <div key={ads[i]?.key ?? `ph-${side}-${i}`} className="shrink-0">
            {i < usable && ads[i] ? (
              <AdTile item={ads[i]} placement={`rail_${side}`} />
            ) : (
              <PlaceholderTile />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

const MarqueePill = ({ item, placement }: { item: RailAd; placement: string }) => {
  const inner = (
    <>
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt={item.name}
          loading="lazy"
          width={24}
          height={24}
          className="h-6 w-6 rounded-md object-cover shrink-0"
        />
      ) : (
        <span className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
          {item.name[0]}
        </span>
      )}
      <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.name}</span>
    </>
  );
  const cls =
    'flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shrink-0';
  return item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer sponsored nofollow"
      onClick={() => trackAdClick(item, placement)}
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <Link to={item.href} onClick={() => trackAdClick(item, placement)} className={cls}>
      {inner}
    </Link>
  );
};

const MarqueeRow = ({
  ads,
  reverse,
  placement,
}: {
  ads: RailAd[];
  reverse?: boolean;
  placement: string;
}) => {
  const items = ads.length > 0 ? ads : [];
  // Every cycle ends with an empty "Your ad here" tile.
  const cycle: (RailAd | null)[] = [...items, null];
  const loop = [...cycle, ...cycle, ...cycle];
  return (
    <div className="overflow-hidden w-full">
      <div
        className="flex items-center gap-2 w-max"
        style={{
          animation: `${reverse ? 'rail-marquee-rev' : 'rail-marquee'} 45s linear infinite`,
        }}
      >
        {loop.map((item, i) =>
          item ? (
            <MarqueePill key={`${item.key}-${i}`} item={item} placement={placement} />
          ) : (
            <Link
              key={`ph-${i}`}
              to="/advertise"
              className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/10 px-3 py-2 shrink-0"
            >
              <span className="h-6 w-6 rounded-md bg-muted/30 flex items-center justify-center text-sm text-muted-foreground">
                +
              </span>
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Your ad here
              </span>
            </Link>
          )
        )}
      </div>
    </div>
  );
};

const MobileAdMarquees = ({
  ads,
  isCampaign,
  enabled,
}: {
  ads: RailAd[];
  isCampaign?: boolean;
  enabled?: boolean;
}) => {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add('has-mobile-marquee');
    return () => root.classList.remove('has-mobile-marquee');
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <style>{`
        @keyframes rail-marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @keyframes rail-marquee-rev { from { transform: translateX(-33.333%); } to { transform: translateX(0); } }
      `}</style>
      <div className="lg:hidden fixed inset-x-0 top-0 z-[100] isolate flex h-[calc(54px+env(safe-area-inset-top))] items-end overflow-hidden bg-background pb-1.5 border-b border-border/60">
        <MarqueeRow ads={ads} placement="marquee_top" />
      </div>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-[100] isolate flex h-[calc(54px+env(safe-area-inset-bottom))] items-start overflow-hidden bg-background pt-1.5 border-t border-border/60">
        <MarqueeRow ads={ads} reverse placement="marquee_bottom" />
      </div>
    </>
  );
};


const SideAdRails = ({ isCampaignPage }: { isCampaignPage?: boolean }) => {
  const { pathname } = useLocation();
  const [ads, setAds] = useState<RailAd[]>([]);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const fetchAds = async () => {
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
          products(id, slug, name, tagline, product_media(url, type))
        `)
        .lte('start_date', today)
        .gte('end_date', today)
        .in('sponsorship_type', ['website', 'combined']);

      if (!data || data.length === 0) return;

      const items = weightedShuffle(data as any[])
        .map((s: any): RailAd | null => {
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
        .filter((x: RailAd | null): x is RailAd => x !== null);

      setAds(items);
    };

    fetchAds();
  }, []);

  // Rotate through the FULL inventory so every purchased ad gets rail exposure,
  // not just the first 10.
  useEffect(() => {
    if (ads.length <= SLOTS_PER_SIDE) return;
    const id = setInterval(() => setOffset((o) => (o + 1) % ads.length), 12000);
    return () => clearInterval(id);
  }, [ads.length]);

  const rotated =
    ads.length > 0
      ? Array.from({ length: ads.length }, (_, i) => ads[(i + offset) % ads.length])
      : [];

  const showMobileMarquee = pathname === '/' || pathname.startsWith('/vibecodedit');

  if (isCampaignPage) {
    return (
      <>
        <MobileAdMarquees ads={ads} isCampaign enabled={showMobileMarquee} />
        <Rail ads={rotated.slice(0, SLOTS_PER_SIDE - 1)} side="right" isCampaign reserveLast />
      </>
    );
  }

  // Fill rails left-to-right, top-to-bottom so ads read in order and the
  // right rail only gets an ad once the left rail is fully occupied.
  // The final slot of the right rail is always reserved as an empty ad slot.
  const left = rotated.slice(0, SLOTS_PER_SIDE);
  const right = rotated.slice(SLOTS_PER_SIDE, SLOTS_PER_SIDE * 2 - 1);


  return (
    <>
      <MobileAdMarquees ads={ads} isCampaign={isCampaignPage} enabled={showMobileMarquee} />
      <Rail ads={left} side="left" />
      <Rail ads={right} side="right" reserveLast />
    </>
  );
};

export default SideAdRails;
