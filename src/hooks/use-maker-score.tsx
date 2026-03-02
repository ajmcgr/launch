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
      // Get user_id from username
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch maker_scores points and launch count in parallel
      const [scoresRes, launchesRes] = await Promise.all([
        supabase
          .from('maker_scores' as any)
          .select('points')
          .eq('user_id', user.id),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('status', 'launched'),
      ]);

      // Sum all maker score points
      let totalPoints = 0;
      if (!scoresRes.error && scoresRes.data) {
        totalPoints = (scoresRes.data as any[]).reduce((sum, row) => sum + (row.points || 0), 0);
      }

      // Use total points if available, otherwise fall back to launch count
      const launchCount = launchesRes.count || 0;
      const finalScore = totalPoints > 0 ? totalPoints : launchCount;

      setScore(finalScore > 0 ? finalScore : null);
      setLoading(false);
    };

    fetchScore();
  }, [username]);

  return { score, loading };
};
