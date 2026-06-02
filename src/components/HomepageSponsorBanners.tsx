import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
      const { data } = await (supabase as any)
        .from('homepage_sponsors')
        .select('id, sponsor_name, banner_image_url, destination_url')
        .eq('enabled', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('position', { ascending: true });
      setSponsors((data as Sponsor[]) || []);
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

  const sliced = list.slice(offset, limit !== undefined ? offset + limit : undefined);
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
            href={s.destination_url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => handleClick(s.id)}
            className="block w-full"
          >
            <img
              src={resolveSrc(s.banner_image_url)}
              alt={`${s.sponsor_name} — Featured Partner`}
              className="w-full h-auto transition-all duration-200 hover:opacity-95"
              loading="lazy"
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
