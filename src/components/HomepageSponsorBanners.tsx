import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { weightedShuffle } from '@/lib/weightedPick';
import mediaBanner from '@/assets/sponsors/media-banner.png';
import roachBanner from '@/assets/sponsors/roach-banner.png';



interface Sponsor {
  id: string;
  sponsor_name: string;
  banner_image_url: string;
  destination_url: string;
}

// Map relative bundled-asset paths from DB → imported asset URLs
const assetMap: Record<string, string> = {
  '/src/assets/sponsors/media-banner.png': mediaBanner,
  '/src/assets/sponsors/roach-banner.png': roachBanner,
};
const resolveSrc = (url: string) => assetMap[url] || url;
const resolveHref = (url: string) => {
  if (!url) return '#';
  return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
};

interface Props {
  /** Optional filter (e.g. only the first banner, or by position range) */
  limit?: number;
  offset?: number;
  className?: string;
  /** If no sponsor exists at this offset, still render the bundled media banner. */
  fallbackMedia?: boolean;
}

/**
 * Renders DB-managed homepage sponsor banners.
 * Falls back to bundled Media + Roach banners if no active sponsors exist.
 */
const HomepageSponsorBanners = ({ limit, offset = 0, className, fallbackMedia = false }: Props) => {
  const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
  const trackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchSponsors = async () => {
      const today = new Date().toISOString().split('T')[0];
      // Use end-of-day so sponsors starting "today" (stored with a time) still show,
      // regardless of the visitor's timezone.
      const endOfToday = `${today}T23:59:59.999Z`;
      const { data } = await (supabase as any)
        .from('homepage_sponsors')
        .select('id, sponsor_name, banner_image_url, destination_url, weight')
        .eq('enabled', true)
        .lte('start_date', endOfToday)
        .gte('end_date', today);
      // Weighted random order so every active sponsor rotates fairly.
      const shuffled = weightedShuffle((data as any[]) || []);
      setSponsors(shuffled as Sponsor[]);
    };
    fetchSponsors();
  }, []);

  // Track impressions
  useEffect(() => {
    if (!sponsors) return;
    sponsors.forEach(s => {
      if (trackedRef.current.has(s.id)) return;
      trackedRef.current.add(s.id);
      (supabase as any).rpc('increment_homepage_sponsor_impression', { _sponsor_id: s.id }).then(() => {}, () => {});
    });
  }, [sponsors]);

  if (sponsors === null) return null;

  // Fallback when DB is empty (e.g. SQL not yet run)
  const list: Sponsor[] = sponsors.length > 0 ? sponsors : [
    { id: 'fallback-media', sponsor_name: 'Media', banner_image_url: '/src/assets/sponsors/media-banner.png', destination_url: 'https://trymedia.ai/' },
    { id: 'fallback-roach', sponsor_name: 'Roach', banner_image_url: '/src/assets/sponsors/roach-banner.png', destination_url: 'https://roachclo.com/' },
    { id: 'fallback-media-2', sponsor_name: 'Media', banner_image_url: '/src/assets/sponsors/media-banner.png', destination_url: 'https://trymedia.ai/' },
  ];

  let sliced = list.slice(offset, limit !== undefined ? offset + limit : undefined);
  // Fewer active sponsors than slots: reuse real sponsors instead of old placeholder banners.
  if (sliced.length === 0 && sponsors.length > 0 && limit !== undefined) {
    sliced = Array.from({ length: limit }, (_, i) => sponsors[(offset + i) % sponsors.length]);
  }
  if (sliced.length === 0 && fallbackMedia) {
    sliced = [{ id: 'fallback-media-slot', sponsor_name: 'Media', banner_image_url: '/src/assets/sponsors/media-banner.png', destination_url: 'https://trymedia.ai/' }];
  }
  if (sliced.length === 0) return null;

  const handleClick = (id: string) => {
    if (id.startsWith('fallback-')) return;
    (supabase as any).rpc('increment_homepage_sponsor_click', { _sponsor_id: id }).then(() => {}, () => {});
  };

  return (
    <div className={className}>
      {sliced.map(s => (
        <div key={s.id} className="py-6 flex flex-col items-center w-full">
          <a
            href={resolveHref(s.destination_url)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => handleClick(s.id)}
            className="block w-full"
          >
            <TrimmedBanner
              src={resolveSrc(s.banner_image_url)}
              alt={`${s.sponsor_name} — Featured Partner`}
            />
          </a>
          <Link to="/media-kit" className="text-[10px] text-muted-foreground opacity-60 hover:opacity-100 mt-2">
            Featured Partner · Become a partner
          </Link>
        </div>
      ))}
    </div>
  );
};

export default HomepageSponsorBanners;

// Banners sometimes ship with baked-in white/transparent letterbox bars that
// look broken in dark mode. Detect blank edge rows and crop them out.
const TrimmedBanner = ({ src, alt }: { src: string; alt: string }) => {
  const [crop, setCrop] = useState<{ topPct: number; ratio: number } | null>(null);

  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const step = Math.max(1, Math.floor(w / 200));
      const isBlank = (y: number) => {
        for (let x = 0; x < w; x += step) {
          const i = (y * w + x) * 4;
          if (data[i + 3] > 16 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) return false;
        }
        return true;
      };
      let top = 0; while (top < h - 1 && isBlank(top)) top++;
      let bottom = h - 1; while (bottom > top && isBlank(bottom)) bottom--;
      const trimmed = bottom - top + 1;
      if (trimmed === h || trimmed < h * 0.2) return;
      // margin-top % is relative to width, so express offset against width.
      setCrop({ topPct: (top / w) * 100, ratio: w / trimmed });
    } catch {
      // Image served without CORS: show as-is.
    }
  };

  return (
    <div
      className="w-full overflow-hidden transition-opacity duration-200 hover:opacity-95"
      style={crop ? { aspectRatio: String(crop.ratio) } : undefined}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        onLoad={onLoad}
        loading="lazy"
        className="block w-full h-auto"
        style={crop ? { marginTop: `-${crop.topPct}%` } : undefined}
      />
    </div>
  );
};
