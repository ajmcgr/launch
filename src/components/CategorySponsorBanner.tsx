import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { weightedPick } from '@/lib/weightedPick';
import mediaBanner from '@/assets/sponsors/media-banner.png';

interface Sponsor {
  id: string;
  sponsor_name: string;
  banner_image_url: string;
  destination_url: string;
}

interface Props {
  categoryId: number;
  categoryName: string;
}

const CategorySponsorBanner = ({ categoryId, categoryName }: Props) => {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchSponsor = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('category_sponsors')
        .select('id, sponsor_name, banner_image_url, destination_url, weight')
        .eq('category_id', categoryId)
        .eq('enabled', true)
        .lte('start_date', today)
        .gte('end_date', today);

      if (cancelled) return;
      // Weighted random pick across ALL active sponsors for this category.
      const s = weightedPick((data as any[]) || []) as Sponsor | null;
      setSponsor(s);
      setLoading(false);
    };
    fetchSponsor();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Track impression once per sponsor view
  useEffect(() => {
    if (!sponsor) return;
    if (trackedRef.current === sponsor.id) return;
    trackedRef.current = sponsor.id;
    supabase.rpc('increment_category_sponsor_impression' as any, { _sponsor_id: sponsor.id }).then(() => {}, () => {});
  }, [sponsor]);

  const handleClick = () => {
    if (sponsor) {
      supabase.rpc('increment_category_sponsor_click' as any, { _sponsor_id: sponsor.id }).then(() => {}, () => {});
    }
  };

  if (loading) return null;

  // Active sponsor
  if (sponsor) {
    return (
      <div className="w-full flex flex-col items-center py-4 mb-6">
        <a
          href={sponsor.destination_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block w-full"
        >
          <img
            src={sponsor.banner_image_url}
            alt={`${sponsor.sponsor_name} — sponsoring ${categoryName}`}
            className="w-full h-auto rounded-md transition-all duration-200 hover:opacity-95"
            loading="lazy"
          />
        </a>
        <p className="text-[10px] text-muted-foreground opacity-60 mt-2">
          Featured Partner ·{' '}
          <Link to="/media-kit" className="hover:opacity-100 hover:underline">
            Become a Partner
          </Link>
        </p>
      </div>
    );
  }

  // Fallback: Media banner
  return (
    <div className="w-full flex flex-col items-center py-4 mb-6">
      <Link to="/media-kit" className="block w-full">
        <img
          src={mediaBanner}
          alt="Media - Any Journalist or Creator Email. Instantly."
          className="w-full h-auto rounded-md transition-all duration-200 hover:opacity-95"
          loading="lazy"
        />
      </Link>
      <p className="text-[10px] text-muted-foreground opacity-60 mt-2">
        Featured Partner ·{' '}
        <Link to="/media-kit" className="hover:opacity-100 hover:underline">
          Become a Partner
        </Link>
      </p>
    </div>
  );
};

export default CategorySponsorBanner;
