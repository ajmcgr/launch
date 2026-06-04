import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrendingBuilder {
  user_id: string;
  username: string;
  avatar_url: string | null;
  name: string | null;
  currentScore: number;
  previousScore: number;
  currentRank: number | null;
  previousRank: number | null;
  rankChange: number | null; // positive = moved up
  isNewEntrant: boolean;
  followers: number;
  totalLaunches: number;
  weeklyLaunches: number;
  platforms: string[];
}

function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export const useLeaderboardTrends = () => {
  const [builders, setBuilders] = useState<TrendingBuilder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const currentWeek = getCurrentWeekStart();
      const prevWeek = new Date(currentWeek);
      prevWeek.setUTCDate(prevWeek.getUTCDate() - 7);
      const earlyHistory = new Date(currentWeek);
      earlyHistory.setUTCDate(earlyHistory.getUTCDate() - 28); // 4-week look-back for "new"

      const currentWeekStr = toDateStr(currentWeek);
      const prevWeekStr = toDateStr(prevWeek);
      const earlyHistoryStr = toDateStr(earlyHistory);

      const weekEnd = new Date(currentWeek);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

      const [currentScoresRes, prevScoresRes, historicScoresRes, weeklyLaunchesRes, totalLaunchesRes] = await Promise.all([
        supabase.from('maker_scores' as any).select('user_id, points').eq('week_start_date', currentWeekStr),
        supabase.from('maker_scores' as any).select('user_id, points').eq('week_start_date', prevWeekStr),
        supabase
          .from('maker_scores' as any)
          .select('user_id')
          .gte('week_start_date', earlyHistoryStr)
          .lt('week_start_date', currentWeekStr),
        supabase
          .from('products')
          .select('owner_id, platforms')
          .eq('status', 'launched')
          .gte('launch_date', `${currentWeekStr}T00:00:00Z`)
          .lte('launch_date', `${toDateStr(weekEnd)}T23:59:59Z`),
        supabase.from('products').select('owner_id').eq('status', 'launched'),
      ]);

      const currentMap = new Map<string, number>();
      const prevMap = new Map<string, number>();
      const historicSet = new Set<string>();
      const weeklyLaunchMap = new Map<string, number>();
      const totalLaunchMap = new Map<string, number>();
      const platformMap = new Map<string, Set<string>>();

      (currentScoresRes.data as any[] | null)?.forEach((r) => {
        currentMap.set(r.user_id, (currentMap.get(r.user_id) || 0) + (r.points || 0));
      });
      (prevScoresRes.data as any[] | null)?.forEach((r) => {
        prevMap.set(r.user_id, (prevMap.get(r.user_id) || 0) + (r.points || 0));
      });
      (historicScoresRes.data as any[] | null)?.forEach((r) => historicSet.add(r.user_id));

      (weeklyLaunchesRes.data as any[] | null)?.forEach((p) => {
        weeklyLaunchMap.set(p.owner_id, (weeklyLaunchMap.get(p.owner_id) || 0) + 1);
        const tags: string[] = p.platforms || [];
        if (tags && tags.length) {
          const set = platformMap.get(p.owner_id) || new Set<string>();
          tags.forEach((t) => set.add(t));
          platformMap.set(p.owner_id, set);
        }
      });

      (totalLaunchesRes.data as any[] | null)?.forEach((p) => {
        totalLaunchMap.set(p.owner_id, (totalLaunchMap.get(p.owner_id) || 0) + 1);
      });

      // Fallback: if a user launched this week but has no score row, infer 10 pts per launch.
      weeklyLaunchMap.forEach((count, uid) => {
        if (!currentMap.has(uid)) currentMap.set(uid, count * 10);
      });

      // Build rank arrays from score maps
      const currentRanked = [...currentMap.entries()]
        .filter(([, p]) => p > 0)
        .sort((a, b) => b[1] - a[1]);
      const prevRanked = [...prevMap.entries()]
        .filter(([, p]) => p > 0)
        .sort((a, b) => b[1] - a[1]);

      const currentRankMap = new Map<string, number>();
      currentRanked.forEach(([uid], i) => currentRankMap.set(uid, i + 1));
      const prevRankMap = new Map<string, number>();
      prevRanked.forEach(([uid], i) => prevRankMap.set(uid, i + 1));

      const allUserIds = new Set<string>([...currentMap.keys(), ...prevMap.keys()]);
      if (allUserIds.size === 0) {
        setBuilders([]);
        setLoading(false);
        return;
      }

      const userIdList = [...allUserIds];

      // Fetch profiles + follower counts in chunks
      const chunk = 200;
      const profileReqs: any[] = [];
      for (let i = 0; i < userIdList.length; i += chunk) {
        const slice = userIdList.slice(i, i + chunk);
        profileReqs.push(
          supabase.from('users').select('id, username, avatar_url, name').in('id', slice)
        );
      }
      const followerReq = supabase.from('follows').select('followed_id').in('followed_id', userIdList);

      const [profileResps, followerRes] = await Promise.all([
        Promise.all(profileReqs),
        followerReq,
      ]);

      const followerMap = new Map<string, number>();
      (followerRes.data as any[] | null)?.forEach((f) => {
        followerMap.set(f.followed_id, (followerMap.get(f.followed_id) || 0) + 1);
      });

      const profileRows = profileResps.flatMap((r) => (r.error || !r.data ? [] : r.data));

      const result: TrendingBuilder[] = profileRows
        .filter((u: any) => !!u.username)
        .map((u: any) => {
          const currentScore = currentMap.get(u.id) || 0;
          const previousScore = prevMap.get(u.id) || 0;
          const currentRank = currentRankMap.get(u.id) || null;
          const previousRank = prevRankMap.get(u.id) || null;
          const rankChange =
            currentRank != null && previousRank != null ? previousRank - currentRank : null;
          const isNewEntrant = currentScore > 0 && !historicSet.has(u.id);
          return {
            user_id: u.id,
            username: u.username,
            avatar_url: u.avatar_url,
            name: u.name,
            currentScore,
            previousScore,
            currentRank,
            previousRank,
            rankChange,
            isNewEntrant,
            followers: followerMap.get(u.id) || 0,
            totalLaunches: totalLaunchMap.get(u.id) || 0,
            weeklyLaunches: weeklyLaunchMap.get(u.id) || 0,
            platforms: [...(platformMap.get(u.id) || [])].slice(0, 3),
          };
        });

      setBuilders(result);
      setLoading(false);
    };

    fetch();
  }, []);

  return { builders, loading };
};
