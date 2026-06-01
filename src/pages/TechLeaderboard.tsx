import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type SortMode = 'today' | 'weekly' | 'monthly' | 'yearly' | 'alltime';

const TAB_CONFIG: { key: SortMode; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'yearly', label: 'Year' },
  { key: 'alltime', label: 'All' },
];

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
};

const getStartDate = (mode: SortMode): string | null => {
  const now = new Date();
  const utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  switch (mode) {
    case 'today':
      return utcNow.toISOString();
    case 'weekly': {
      const d = new Date(utcNow);
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    case 'monthly': {
      const d = new Date(utcNow);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString();
    }
    case 'yearly': {
      const d = new Date(utcNow);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    }
    case 'alltime':
      return null;
  }
};

interface TechItem {
  id: number;
  name: string;
  slug: string;
  product_count: number;
}

const TechLeaderboard = () => {
  const [sortMode, setSortMode] = useState<SortMode>('alltime');

  const { data: techItems, isLoading } = useQuery({
    queryKey: ['tech-leaderboard', sortMode],
    queryFn: async () => {
      const startDate = getStartDate(sortMode);

      // Get ALL stack items (raise default limit so the full taxonomy shows up)
      const { data: stackItems, error: stackError } = await supabase
        .from('stack_items')
        .select('id, name, slug')
        .order('name')
        .limit(5000);
      if (stackError) throw stackError;

      // Get product_stack_map with explicit high limit so counts aren't truncated
      const { data: mappings, error: mapError } = await supabase
        .from('product_stack_map')
        .select('stack_item_id, product_id')
        .limit(50000);
      if (mapError) throw mapError;

      if (startDate) {
        // Need to filter by product launch date - get products in range
        const { data: products, error: prodError } = await supabase
          .from('products')
          .select('id')
          .eq('status', 'launched')
          .gte('launch_date', startDate);
        if (prodError) throw prodError;

        const validProductIds = new Set((products || []).map((p: any) => p.id));

        const countMap: Record<number, number> = {};
        (mappings || []).forEach((m: any) => {
          if (validProductIds.has(m.product_id)) {
            countMap[m.stack_item_id] = (countMap[m.stack_item_id] || 0) + 1;
          }
        });

        return (stackItems || [])
          .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, product_count: countMap[s.id] || 0 }))
          .filter((s) => s.product_count > 0)
          .sort((a, b) => b.product_count - a.product_count) as TechItem[];
      } else {
        // All time - count all mappings
        const countMap: Record<number, number> = {};
        (mappings || []).forEach((m: any) => {
          countMap[m.stack_item_id] = (countMap[m.stack_item_id] || 0) + 1;
        });

        return (stackItems || [])
          .map((s: any) => ({ id: s.id, name: s.name, slug: s.slug, product_count: countMap[s.id] || 0 }))
          .sort((a, b) => b.product_count - a.product_count) as TechItem[];
      }
    },
  });

  return (
    <div className="min-h-screen bg-background py-6">
      <Helmet>
        <title>Top Tech | Launch</title>
        <meta name="description" content="Most popular technologies used by makers on Launch. Discover the top tools and frameworks powering indie products." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-6 font-reckless">Top Tech</h1>

        {/* Sort Tabs */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSortMode(tab.key)}
                className={`
                  inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
                  ${sortMode === tab.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard List */}
        <div>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-2">
                <Skeleton className="h-4 w-5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))
          ) : !techItems || techItems.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <p className="text-sm">No technology data yet for this period.</p>
            </div>
          ) : (
            techItems.map((item, index) => {
              const rank = index + 1;
              return (
                <Link
                  key={item.id}
                  to={`/tech/${item.slug}`}
                  className="flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 flex justify-center flex-shrink-0">
                        {getRankBadge(rank)}
                      </div>
                      <h3 className="font-semibold text-base text-foreground truncate">
                        {item.name}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-sm text-foreground flex-shrink-0 tabular-nums">
                    <Layers className="h-3.5 w-3.5" />
                    {item.product_count.toLocaleString()}
                    <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                      products
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TechLeaderboard;
