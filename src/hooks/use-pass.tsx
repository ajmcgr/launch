import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PassStatus {
  hasActivePass: boolean;
  expiresAt: Date | null;
  plan: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
}

export const usePass = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['pass', userId],
    queryFn: async (): Promise<PassStatus> => {
      if (!userId) {
        return { 
          hasActivePass: false, 
          expiresAt: null, 
          plan: null,
          subscriptionStatus: null,
          cancelAtPeriodEnd: false,
        };
      }

      const { data, error } = await supabase
        .from('users')
        .select('plan, annual_access_expires_at, subscription_status, subscription_cancel_at_period_end')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { 
          hasActivePass: false, 
          expiresAt: null, 
          plan: null,
          subscriptionStatus: null,
          cancelAtPeriodEnd: false,
        };
      }

      const expiresAt = data.annual_access_expires_at ? new Date(data.annual_access_expires_at) : null;
      
      // User has active pass if:
      // 1. They have annual_access plan AND valid expiry date AND expiry is in the future
      // 2. AND subscription_status is 'active' OR (status is null/inactive but expiry is valid - handles webhook delay)
      const hasValidExpiry = expiresAt !== null && expiresAt > new Date();
      const hasActivePlan = data.plan === 'annual_access';
      const hasActiveStatus = data.subscription_status === 'active';
      
      // Be lenient: if they have the plan and a valid future expiry, treat as active.
      // This covers webhook lag and Stripe's transient 'incomplete'/'trialing'/'past_due' states.
      const hasActivePass = hasActivePlan && hasValidExpiry;

      return {
        hasActivePass,
        expiresAt,
        plan: data.plan,
        subscriptionStatus: data.subscription_status,
        cancelAtPeriodEnd: data.subscription_cancel_at_period_end ?? false,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // Cache for 30 seconds so webhook updates surface quickly
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};

// Hook to invalidate pass status cache - use after checkout success
export const useInvalidatePassStatus = () => {
  const queryClient = useQueryClient();
  return (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['pass', userId] });
  };
};
