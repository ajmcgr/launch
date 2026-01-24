import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ProductIcon {
  id: string;
  name: string;
  slug: string;
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
    .limit(60);

  if (error) throw error;

  // Transform and deduplicate by product_id
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
      slug: item.products.slug,
      icon_url: item.url,
    }))
    .slice(0, 45);
};

export const PopularProductIcons = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ['popular-product-icons'],
    queryFn: fetchPopularProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading || !products?.length) {
    return null;
  }

  // Create three rows with staggered animation - 15 icons per row
  const rows = [
    products.slice(0, 15),
    products.slice(15, 30),
    products.slice(30, 45),
  ].filter(row => row.length > 0);

  return (
    <div className="pt-4 pb-12 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      <div className="flex flex-col items-center gap-3 md:gap-4 px-4">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className={cn(
              "flex items-center justify-center gap-2 md:gap-3 lg:gap-4 flex-wrap",
              // Offset middle row for honeycomb effect
              rowIndex === 1 && "ml-6 md:ml-10"
            )}
          >
            {row.map((product, index) => (
              <Link
                to={`/launch/${product.slug}`}
                key={product.id}
                className="group relative"
                style={{
                  animationDelay: `${(rowIndex * 100) + (index * 50)}ms`,
                }}
              >
                <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden bg-muted shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:z-10">
                  <img
                    src={product.icon_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {/* Tooltip on hover */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                  <span className="text-xs font-medium bg-popover text-popover-foreground px-2 py-1 rounded shadow-lg whitespace-nowrap">
                    {product.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularProductIcons;
