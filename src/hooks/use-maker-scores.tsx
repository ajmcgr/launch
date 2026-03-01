import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MakerScoreData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  name: string | null;
  weeklyScore: number;
  karma: number;
  totalLaunches: number;
  totalReviews: number;
}

type SortMode = 'today' | 'weekly' | 'monthly' | 'yearly' | 'alltime';

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString().split('T')[0];
}

export const useMakerScores = (sortMode: SortMode = 'weekly', weekFilter?: string) => {
  const [users, setUsers] = useState<MakerScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const weekStart = weekFilter || getCurrentWeekStart();

      // Fetch all data in parallel
      const [karmaRes, scoresRes, launchesRes, reviewsRes, weeksRes] = await Promise.all([
        supabase
          .from('user_karma' as any)
          .select('*')
          .gt('karma', 0)
          .order('karma', { ascending: false })
          .limit(100),
        supabase
          .from('maker_scores' as any)
          .select('user_id, points, week_start_date')
          .eq('week_start_date', weekStart),
        // Total launches per owner
        supabase
          .from('products')
          .select('owner_id')
          .eq('status', 'launched'),
        // Total reviews received per product owner
        supabase
          .from('product_ratings')
          .select('product_id'),
        // Available weeks for dropdown
        supabase
          .from('maker_scores' as any)
          .select('week_start_date')
          .order('week_start_date', { ascending: false }),
      ]);

      // Build score map
      const scoreMap = new Map<string, number>();
      if (!scoresRes.error && scoresRes.data) {
        (scoresRes.data as any[]).forEach((s) => {
          scoreMap.set(s.user_id, s.points);
        });
      }

      // Build launch count map
      const launchMap = new Map<string, number>();
      if (!launchesRes.error && launchesRes.data) {
        launchesRes.data.forEach((p) => {
          launchMap.set(p.owner_id, (launchMap.get(p.owner_id) || 0) + 1);
        });
      }

      // For reviews, we need product owners - fetch product ids from ratings
      const reviewCountMap = new Map<string, number>();
      if (!reviewsRes.error && reviewsRes.data && reviewsRes.data.length > 0) {
        const productIds = [...new Set(reviewsRes.data.map((r) => r.product_id))];
        // Get owners for these products
        const { data: productOwners } = await supabase
          .from('products')
          .select('id, owner_id')
          .in('id', productIds.slice(0, 500));
        
        const productOwnerMap = new Map<string, string>();
        if (productOwners) {
          productOwners.forEach((p) => productOwnerMap.set(p.id, p.owner_id));
        }
        
        reviewsRes.data.forEach((r) => {
          const ownerId = productOwnerMap.get(r.product_id);
          if (ownerId) {
            reviewCountMap.set(ownerId, (reviewCountMap.get(ownerId) || 0) + 1);
          }
        });
      }

      // Available weeks (deduplicated)
      const weeksSet = new Set<string>();
      weeksSet.add(getCurrentWeekStart());
      if (!weeksRes.error && weeksRes.data) {
        (weeksRes.data as any[]).forEach((w) => weeksSet.add(w.week_start_date));
      }
      setAvailableWeeks([...weeksSet].sort().reverse());

      // Merge all data
      if (!karmaRes.error && karmaRes.data) {
        const merged: MakerScoreData[] = (karmaRes.data as any[]).map((user) => ({
          user_id: user.user_id,
          username: user.username,
          avatar_url: user.avatar_url,
          name: user.name,
          weeklyScore: scoreMap.get(user.user_id) || 0,
          karma: user.karma || 0,
          totalLaunches: launchMap.get(user.user_id) || 0,
          totalReviews: reviewCountMap.get(user.user_id) || 0,
        }));

        setUsers(merged);
      }
      setLoading(false);
    };

    fetchData();
  }, [sortMode, weekFilter]);

  const sorted = useMemo(() => {
    const copy = [...users];
    switch (sortMode) {
      case 'today':
      case 'weekly':
      case 'monthly':
      case 'yearly':
        return copy.sort((a, b) => b.weeklyScore - a.weeklyScore);
      case 'alltime':
        return copy.sort((a, b) => b.totalLaunches - a.totalLaunches);
      default:
        return copy;
    }
  }, [users, sortMode]);

  return { users: sorted, loading, availableWeeks };
};
