import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface SponsoredProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  icon_url?: string;
  product_media?: { url: string; type: string }[];
}

const SidebarSponsoredAd = () => {
  const [sponsored, setSponsored] = useState<SponsoredProduct[]>([]);

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
        .limit(2);

      if (data && data.length > 0) {
        setSponsored(
          data.map((s: any) => {
            const p = s.products;
            const icon = p.product_media?.find((m: any) => m.type === 'icon')?.url;
            return {
              id: p.id,
              slug: p.slug,
              name: p.name,
              tagline: p.tagline,
              icon_url: icon,
            };
          })
        );
      }
    };

    fetchSponsored();
  }, []);

  if (sponsored.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sponsored</h3>
      </div>
      <div className="space-y-2">
        {sponsored.map((product) => (
          <Link
            key={product.id}
            to={`/launch/${product.slug}`}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
          >
            {product.icon_url ? (
              <img
                src={product.icon_url}
                alt={product.name}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm font-bold text-muted-foreground">
                {product.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {product.name}
                </p>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 flex-shrink-0 text-muted-foreground border-muted-foreground/30">
                  Ad
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                {product.tagline}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SidebarSponsoredAd;
