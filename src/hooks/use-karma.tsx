import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface KarmaData {
  user_id: string;
  username: string;
  avatar_url: string | null;
  name: string | null;
  karma: number;
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
      const { data, error } = await supabase
        .from('user_karma' as any)
        .select('*')
        .gt('karma', 0)
        .order('karma', { ascending: false })
        .limit(limit);

      if (!error && data) {
        setUsers(data as unknown as KarmaData[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [limit]);

  return { users, loading };
};
