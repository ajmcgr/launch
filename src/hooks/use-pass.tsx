import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PassStatus {
  hasActivePass: boolean;
  expiresAt: Date | null;
  plan: string | null;
}

export const usePass = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['pass', userId],
    queryFn: async (): Promise<PassStatus> => {
      if (!userId) {
        return { hasActivePass: false, expiresAt: null, plan: null };
      }

      const { data, error } = await supabase
        .from('users')
        .select('plan, annual_access_expires_at')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { hasActivePass: false, expiresAt: null, plan: null };
      }

      const expiresAt = data.annual_access_expires_at ? new Date(data.annual_access_expires_at) : null;
      const hasActivePass = 
        data.plan === 'annual_access' && 
        expiresAt !== null && 
        expiresAt > new Date();

      return {
        hasActivePass,
        expiresAt,
        plan: data.plan,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
