import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const PopularTechThisWeek = () => {
  const { data: techItems, isLoading } = useQuery({
    queryKey: ['popular-tech-this-week'],
    queryFn: async () => {
      const now = new Date();
      const weekAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: stackItems } = await supabase
        .from('stack_items')
        .select('id, name, slug');
      if (!stackItems?.length) return [];

      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('status', 'launched')
        .gte('launch_date', weekAgo.toISOString());

      const validIds = new Set((products || []).map((p: any) => p.id));

      const { data: mappings } = await supabase
        .from('product_stack_map')
        .select('stack_item_id, product_id');

      const countMap: Record<number, number> = {};
      (mappings || []).forEach((m: any) => {
        if (validIds.has(m.product_id)) {
          countMap[m.stack_item_id] = (countMap[m.stack_item_id] || 0) + 1;
        }
      });

      const withCounts = stackItems
        .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, product_count: countMap[s.id] || 0 }))
        .filter((s) => s.product_count > 0)
        .sort((a, b) => b.product_count - a.product_count);

      return shuffleAndPick(withCounts.slice(0, 15), 5);
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <section className="py-6 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-7 w-64 mx-auto mb-6" />
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-28 rounded-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!techItems || techItems.length === 0) return null;

  return (
    <section className="py-6 bg-background">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-6">Popular Tech on Launch This Week</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {techItems.map((item) => (
            <Link
              key={item.id}
              to={`/tech/${item.slug}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-foreground hover:text-primary hover:border-primary transition-all hover:scale-105"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="font-medium text-sm">{item.name}</span>
              <span className="text-xs text-muted-foreground">({item.product_count})</span>
            </Link>
          ))}
        </div>
        <div className="text-center mt-4">
          <Link to="/tech" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            View all tech →
          </Link>
        </div>
      </div>
    </section>
  );
};
