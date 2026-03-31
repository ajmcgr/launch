import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface AwardProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  launch_date: string;
  won_monthly: boolean;
  won_weekly: boolean;
  won_daily: boolean;
  thumbnail?: string;
  netVotes: number;
}

interface WeekGroup {
  weekLabel: string;
  gold: AwardProduct | null;
  silver: AwardProduct | null;
  bronze: AwardProduct | null;
}

const Awards = () => {
  const [weeks, setWeeks] = useState<WeekGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      // Fetch all products that have won any award
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, slug, tagline, launch_date, won_monthly, won_weekly, won_daily')
        .or('won_monthly.eq.true,won_weekly.eq.true,won_daily.eq.true')
        .eq('status', 'launched')
        .order('launch_date', { ascending: false });

      if (error) throw error;
      if (!products || products.length === 0) {
        setWeeks([]);
        setLoading(false);
        return;
      }

      // Fetch thumbnails and votes for these products
      const productIds = products.map(p => p.id);
      const [mediaRes, voteRes] = await Promise.all([
        supabase
          .from('product_media')
          .select('product_id, url')
          .in('product_id', productIds)
          .eq('type', 'thumbnail'),
        supabase
          .from('product_vote_counts')
          .select('product_id, net_votes')
          .in('product_id', productIds),
      ]);

      const thumbMap: Record<string, string> = {};
      mediaRes.data?.forEach((m: any) => { thumbMap[m.product_id] = m.url; });

      const voteMap: Record<string, number> = {};
      voteRes.data?.forEach((v: any) => { voteMap[v.product_id] = v.net_votes || 0; });

      const enriched: AwardProduct[] = products.map(p => ({
        ...p,
        thumbnail: thumbMap[p.id],
        netVotes: voteMap[p.id] || 0,
      }));

      // Group by week of launch_date
      const weekMap = new Map<string, WeekGroup>();

      enriched.forEach(p => {
        const d = new Date(p.launch_date);
        // Match PostgreSQL date_trunc('week'): Monday-start, UTC-based
        const utcDay = d.getUTCDay();
        const daysFromMonday = (utcDay + 6) % 7;
        const startOfWeek = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - daysFromMonday));
        const key = startOfWeek.toISOString().substring(0, 10);
        const label = `Week of ${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

        if (!weekMap.has(key)) {
          weekMap.set(key, { weekLabel: label, gold: null, silver: null, bronze: null });
        }
        const group = weekMap.get(key)!;

        if (p.won_monthly && !group.gold) group.gold = p;
        if (p.won_weekly && !group.silver) group.silver = p;
        if (p.won_daily && !group.bronze) group.bronze = p;
      });

      // Sort weeks descending
      const sorted = Array.from(weekMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([, v]) => v);

      setWeeks(sorted);
    } catch (err) {
      console.error('Error fetching awards:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderAwardCard = (product: AwardProduct | null, tier: 'gold' | 'silver' | 'bronze') => {
    if (!product) return null;

    const config = {
      gold: { label: 'GOLD', rankNum: '1' },
      silver: { label: 'SILVER', rankNum: '2' },
      bronze: { label: 'BRONZE', rankNum: '3' },
    }[tier];

    return (
      <Link to={`/launch/${product.slug}`} className="block group">
        <div className="flex items-center gap-4 py-3 hover:bg-muted/30 rounded-lg px-3 transition-colors">
          <span className="text-base font-bold shrink-0">{config.rankNum}.</span>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {product.thumbnail && (
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={product.thumbnail} alt={product.name} className="object-cover" />
                <AvatarFallback className="rounded-lg">{product.name[0]}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{product.name}</p>
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider">{config.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{product.tagline}</p>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">{product.netVotes} votes</Badge>
        </div>
      </Link>
    );
  };

  return (
    <>
      <Helmet>
        <title>Awards — Top Products of the Week | TryLaunch</title>
        <meta name="description" content="Discover the top-ranked products awarded Gold, Silver, and Bronze each week on TryLaunch." />
      </Helmet>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold font-reckless mb-3">Weekly Awards</h1>
          <p className="text-muted-foreground">
            The top 3 products each week earn Gold, Silver, and Bronze awards based on community votes.
          </p>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </div>
        ) : weeks.length === 0 ? (
          <div className="text-center py-16">
            <img src="/assets/badge-golden.svg" alt="Awards" className="h-12 w-auto mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No awards have been given yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-10">
            {weeks.map((week, idx) => (
              <div key={idx}>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{week.weekLabel}</h2>
                <div className="space-y-3">
                  {renderAwardCard(week.gold, 'gold')}
                  {renderAwardCard(week.silver, 'silver')}
                  {renderAwardCard(week.bronze, 'bronze')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Awards;
