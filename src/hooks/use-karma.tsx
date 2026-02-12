import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KarmaData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  name: string | null;
  karma: number;
  karmaChange?: number | null;
}

export const useKarma = (userId?: string) => {
  const [karma, setKarma] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchKarma = async () => {
      const { data, error } = await supabase
        .from('user_karma' as any)
        .select('karma')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setKarma((data as any).karma ?? 0);
      }
      setLoading(false);
    };

    fetchKarma();
  }, [userId]);

  return { karma, loading };
};

export const useKarmaByUsername = (username?: string) => {
  const [karma, setKarma] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const fetchKarma = async () => {
      const { data, error } = await supabase
        .from('user_karma' as any)
        .select('karma')
        .eq('username', username)
        .single();

      if (!error && data) {
        setKarma((data as any).karma ?? 0);
      }
      setLoading(false);
    };

    fetchKarma();
  }, [username]);

  return { karma, loading };
};

export const useKarmaLeaderboard = (limit = 50) => {
  const [users, setUsers] = useState<KarmaData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // Fetch current karma and 7-day-old snapshots in parallel
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const [karmaRes, snapshotRes] = await Promise.all([
        supabase
          .from('user_karma' as any)
          .select('*')
          .gt('karma', 0)
          .order('karma', { ascending: false })
          .limit(limit),
        supabase
          .from('karma_snapshots' as any)
          .select('user_id, karma')
          .eq('snapshot_date', sevenDaysAgo),
      ]);

      if (!karmaRes.error && karmaRes.data) {
        const snapshotMap = new Map<string, number>();
        if (!snapshotRes.error && snapshotRes.data) {
          (snapshotRes.data as any[]).forEach((s) => {
            snapshotMap.set(s.user_id, s.karma);
          });
        }

        const enriched = (karmaRes.data as unknown as KarmaData[]).map((user) => {
          const oldKarma = snapshotMap.get(user.user_id);
          return {
            ...user,
            karmaChange: oldKarma !== undefined ? user.karma - oldKarma : null,
          };
        });

        setUsers(enriched);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [limit]);

  return { users, loading };
};
