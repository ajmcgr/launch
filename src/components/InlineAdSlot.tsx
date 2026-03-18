import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import AdvertiseCTA from '@/components/AdvertiseCTA';

interface SponsoredProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  icon_url?: string;
}

const InlineAdSlot = () => {
  const [sponsored, setSponsored] = useState<SponsoredProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSponsored = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sponsored_products')
        .select(`
          product_id,
          products!inner(
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
        .limit(1);

      if (data && data.length > 0) {
        const p = (data[0] as any).products;
        const icon = p.product_media?.find((m: any) => m.type === 'icon')?.url;
        setSponsored({
          id: p.id,
          slug: p.slug,
          name: p.name,
          tagline: p.tagline,
          icon_url: icon,
        });
      }
      setLoading(false);
    };

    fetchSponsored();
  }, []);

  if (loading) return null;

  // Show sponsored ad if available, otherwise show CTA
  if (!sponsored) {
    return <AdvertiseCTA className="rounded-xl border border-border/50" />;
  }

  return (
    <Link
      to={`/launch/${sponsored.slug}`}
      className="flex items-center gap-4 p-5 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors group"
    >
      {sponsored.icon_url ? (
        <img
          src={sponsored.icon_url}
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
        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
          {sponsored.tagline}
        </p>
      </div>
    </Link>
  );
};

export default InlineAdSlot;
