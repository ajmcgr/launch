import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface RelatedLaunchesProps {
  productId: string;
  tagIds: number[];
  categoryNames: string[];
  stackItemIds: number[];
}

interface MiniProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  iconUrl?: string;
}

const truncateTagline = (text: string) => {
  const match = text?.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
};

const RelatedLaunches = ({
  productId,
  tagIds,
  categoryNames,
  stackItemIds,
}: RelatedLaunchesProps) => {
  const [similar, setSimilar] = useState<MiniProduct[]>([]);
  const [sameTech, setSameTech] = useState<{
    name: string;
    slug: string;
    products: MiniProduct[];
  } | null>(null);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (tagIds.length === 0) return;

      const { data: tagMap } = await supabase
        .from('product_tag_map')
        .select('product_id')
        .in('tag_id', tagIds)
        .neq('product_id', productId);

      const ids = Array.from(new Set(tagMap?.map((t) => t.product_id) || []));
      if (ids.length === 0) return;

      const { data: products } = await supabase
        .from('products')
        .select('id, slug, name, tagline, product_media(url, type)')
        .eq('status', 'launched')
        .in('id', ids.slice(0, 30))
        .limit(6);

      setSimilar(
        (products || []).slice(0, 5).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          tagline: p.tagline || '',
          iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        })),
      );
    };

    const fetchSameTech = async () => {
      if (stackItemIds.length === 0) return;

      // Pick the first tech to feature
      const stackId = stackItemIds[0];
      const { data: stackItem } = await supabase
        .from('stack_items')
        .select('name, slug')
        .eq('id', stackId)
        .maybeSingle();

      if (!stackItem) return;

      const { data: stackMap } = await supabase
        .from('product_stack_map')
        .select('product_id')
        .eq('stack_item_id', stackId)
        .neq('product_id', productId)
        .limit(20);

      const ids = stackMap?.map((s) => s.product_id) || [];
      if (ids.length === 0) return;

      const { data: products } = await supabase
        .from('products')
        .select('id, slug, name, tagline, product_media(url, type)')
        .eq('status', 'launched')
        .in('id', ids)
        .limit(5);

      setSameTech({
        name: stackItem.name,
        slug: stackItem.slug,
        products: (products || []).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          tagline: p.tagline || '',
          iconUrl: p.product_media?.find((m: any) => m.type === 'icon')?.url,
        })),
      });
    };

    fetchSimilar();
    fetchSameTech();
  }, [productId, tagIds.join(','), stackItemIds.join(',')]);

  if (similar.length === 0 && !sameTech?.products?.length) return null;

  const renderItem = (p: MiniProduct) => (
    <li key={p.id}>
      <Link
        to={`/launch/${p.slug}`}
        className="flex items-start gap-3 py-2.5 group"
      >
        {p.iconUrl ? (
          <img
            src={p.iconUrl}
            alt={p.name}
            className="w-10 h-10 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
            {p.name}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {truncateTagline(p.tagline)}
          </div>
        </div>
      </Link>
    </li>
  );

  return (
    <section className="pt-10 mt-10 border-t border-border/40 space-y-10">
      {similar.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Similar products</h2>
          {categoryNames.length > 0 && (
            <p className="text-sm text-muted-foreground mb-3">
              Other launches in{' '}
              {categoryNames.slice(0, 2).map((c, i) => (
                <span key={c}>
                  {i > 0 && ' and '}
                  <Link
                    to={`/category/${c
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')}`}
                    className="underline hover:text-foreground"
                  >
                    {c}
                  </Link>
                </span>
              ))}
            </p>
          )}
          <ul className="divide-y divide-border/30">{similar.map(renderItem)}</ul>
        </div>
      )}

      {sameTech && sameTech.products.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Built with {sameTech.name}
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Discover other products in the {sameTech.name} stack —{' '}
            <Link
              to={`/tech/${sameTech.slug}`}
              className="underline hover:text-foreground"
            >
              see all
            </Link>
            .
          </p>
          <ul className="divide-y divide-border/30">
            {sameTech.products.map(renderItem)}
          </ul>
        </div>
      )}
    </section>
  );
};

export default RelatedLaunches;
