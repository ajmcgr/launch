import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useMakerScoreByUsername = (username?: string) => {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    const fetchScore = async () => {
      // First get user_id from username
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!user) {
        setLoading(false);
        return;
      }

      // Sum all maker_scores for this user
      const { data, error } = await supabase
        .from('maker_scores' as any)
        .select('points')
        .eq('user_id', user.id);

      if (!error && data) {
        const total = (data as any[]).reduce((sum, row) => sum + (row.points || 0), 0);
        setScore(total > 0 ? total : null);
      }
      setLoading(false);
    };

    fetchScore();
  }, [username]);

  return { score, loading };
};
