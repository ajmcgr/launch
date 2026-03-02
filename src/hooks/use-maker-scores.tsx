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

function getDateRangeForMode(sortMode: SortMode): { from?: string; to?: string } {
  const now = new Date();

  switch (sortMode) {
    case 'today': {
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const day = today.toISOString().split('T')[0];
      return { from: day, to: day };
    }
    case 'weekly': {
      const weekStart = getCurrentWeekStart();
      const weekStartDate = new Date(weekStart + 'T00:00:00Z');
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);
      return {
        from: weekStart,
        to: weekEndDate.toISOString().split('T')[0],
      };
    }
    case 'monthly': {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
      return {
        from: monthStart.toISOString().split('T')[0],
        to: monthEnd.toISOString().split('T')[0],
      };
    }
    case 'yearly': {
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const yearEnd = new Date(Date.UTC(now.getUTCFullYear(), 11, 31));
      return {
        from: yearStart.toISOString().split('T')[0],
        to: yearEnd.toISOString().split('T')[0],
      };
    }
    case 'alltime':
    default:
      return {};
  }
}

export const useMakerScores = (sortMode: SortMode = 'weekly', weekFilter?: string) => {
  const [users, setUsers] = useState<MakerScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const scoreDateRange = weekFilter
        ? { from: weekFilter, to: weekFilter }
        : sortMode === 'today'
          ? { from: getCurrentWeekStart(), to: getCurrentWeekStart() } // maker_scores are weekly buckets
          : sortMode === 'weekly'
            ? { from: getCurrentWeekStart(), to: getCurrentWeekStart() }
            : sortMode === 'monthly' || sortMode === 'yearly'
              ? getDateRangeForMode(sortMode)
              : {};

      const launchDateRange = getDateRangeForMode(sortMode);

      const scoresQuery = scoreDateRange.from
        ? scoreDateRange.from === scoreDateRange.to
          ? supabase
              .from('maker_scores' as any)
              .select('user_id, points, week_start_date')
              .eq('week_start_date', scoreDateRange.from)
          : supabase
              .from('maker_scores' as any)
              .select('user_id, points, week_start_date')
              .gte('week_start_date', scoreDateRange.from)
              .lte('week_start_date', scoreDateRange.to as string)
        : supabase
            .from('maker_scores' as any)
            .select('user_id, points, week_start_date');

      const periodLaunchesQuery = launchDateRange.from
        ? supabase
            .from('products')
            .select('owner_id, launch_date')
            .eq('status', 'launched')
            .gte('launch_date', `${launchDateRange.from}T00:00:00Z`)
            .lte('launch_date', `${launchDateRange.to}T23:59:59Z`)
        : supabase
            .from('products')
            .select('owner_id, launch_date')
            .eq('status', 'launched');

      const [scoresRes, totalLaunchesRes, periodLaunchesRes, reviewsRes, weeksRes] = await Promise.all([
        scoresQuery,
        supabase
          .from('products')
          .select('owner_id')
          .eq('status', 'launched'),
        periodLaunchesQuery,
        supabase
          .from('product_ratings')
          .select('product_id'),
        supabase
          .from('maker_scores' as any)
          .select('week_start_date')
          .order('week_start_date', { ascending: false }),
      ]);

      const scoreMap = new Map<string, number>();
      if (!scoresRes.error && scoresRes.data) {
        (scoresRes.data as any[]).forEach((s) => {
          scoreMap.set(s.user_id, (scoreMap.get(s.user_id) || 0) + (s.points || 0));
        });
      }

      const totalLaunchMap = new Map<string, number>();
      if (!totalLaunchesRes.error && totalLaunchesRes.data) {
        totalLaunchesRes.data.forEach((p) => {
          totalLaunchMap.set(p.owner_id, (totalLaunchMap.get(p.owner_id) || 0) + 1);
        });
      }

      const periodLaunchMap = new Map<string, number>();
      if (!periodLaunchesRes.error && periodLaunchesRes.data) {
        periodLaunchesRes.data.forEach((p) => {
          periodLaunchMap.set(p.owner_id, (periodLaunchMap.get(p.owner_id) || 0) + 1);
        });
      }

      // Fallback: if a maker has launches in selected period but no score rows,
      // infer launch points so leaderboards are never empty due to missing backfill/triggers.
      if (sortMode !== 'alltime') {
        periodLaunchMap.forEach((launchCount, userId) => {
          if (!scoreMap.has(userId)) {
            scoreMap.set(userId, launchCount * 10);
          }
        });
      }

      const reviewCountMap = new Map<string, number>();
      if (!reviewsRes.error && reviewsRes.data && reviewsRes.data.length > 0) {
        const productIds = [...new Set(reviewsRes.data.map((r) => r.product_id))];
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

      const weeksSet = new Set<string>();
      weeksSet.add(getCurrentWeekStart());
      if (!weeksRes.error && weeksRes.data) {
        (weeksRes.data as any[]).forEach((w) => weeksSet.add(w.week_start_date));
      }
      setAvailableWeeks([...weeksSet].sort().reverse());

      const userIds = new Set<string>();
      scoreMap.forEach((_, userId) => userIds.add(userId));
      totalLaunchMap.forEach((_, userId) => userIds.add(userId));

      if (userIds.size === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from('users')
        .select('id, username, avatar_url, name')
        .in('id', Array.from(userIds));

      if (profileError || !profileRows) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const merged: MakerScoreData[] = profileRows
        .filter((u) => !!u.username)
        .map((user) => ({
          user_id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          name: user.name,
          weeklyScore: scoreMap.get(user.id) || 0,
          karma: 0,
          totalLaunches: totalLaunchMap.get(user.id) || 0,
          totalReviews: reviewCountMap.get(user.id) || 0,
        }));

      setUsers(merged);
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
