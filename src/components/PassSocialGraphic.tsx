import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

interface ProductIcon {
  id: string;
  name: string;
  icon_url: string;
}

const fetchPopularProducts = async (): Promise<ProductIcon[]> => {
  const { data, error } = await supabase
    .from('product_media')
    .select(`
      product_id,
      url,
      products!inner (
        id,
        name,
        slug
      )
    `)
    .eq('type', 'icon')
    .not('url', 'is', null)
    .limit(80);

  if (error) throw error;

  const seen = new Set<string>();
  return (data || [])
    .filter((item: any) => {
      if (seen.has(item.product_id)) return false;
      seen.add(item.product_id);
      return true;
    })
    .map((item: any) => ({
      id: item.products.id,
      name: item.products.name,
      icon_url: item.url,
    }))
    .slice(0, 60);
};

interface PassSocialGraphicProps {
  variant?: 'twitter' | 'linkedin';
  hideLogo?: boolean;
}

export const PassSocialGraphic = ({ variant = 'twitter', hideLogo = false }: PassSocialGraphicProps) => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['popular-product-icons'],
    queryFn: fetchPopularProducts,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !products?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading icons...
      </div>
    );
  }

  // Different layouts for different platforms
  // Twitter: 1200x675 (16:9), LinkedIn: 1200x627 (1.91:1)
  const isLinkedIn = variant === 'linkedin';
  const aspectRatio = isLinkedIn ? '1200 / 627' : '1200 / 675';

  // Create rows with icons
  const rows = [
    products.slice(0, 12),
    products.slice(12, 24),
    products.slice(24, 36),
    products.slice(36, 48),
    products.slice(48, 60),
  ].filter(row => row.length > 0);

  return (
    <div 
      id="pass-social-graphic"
      className="relative bg-gradient-to-br from-background via-background to-muted overflow-hidden"
      style={{ 
        aspectRatio,
        width: '100%',
        maxWidth: '1200px',
      }}
    >
      {/* Subtle grid pattern background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Icon grid */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "flex items-center justify-center gap-3",
              rowIndex % 2 === 1 && "ml-10"
            )}
          >
            {row.map((product) => (
              <div
                key={product.id}
                className="w-14 h-14 rounded-xl overflow-hidden bg-background shadow-lg ring-1 ring-border/50"
              >
                <img
                  src={product.icon_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Gradient overlay at bottom for logo visibility */}
      {!hideLogo && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/90 to-transparent" />
      )}

      {/* Logo watermark */}
      {!hideLogo && (
        <div className="absolute bottom-4 right-6">
          <img src={logo} alt="Launch" className="h-8 opacity-80" />
        </div>
      )}
    </div>
  );
};

export default PassSocialGraphic;
