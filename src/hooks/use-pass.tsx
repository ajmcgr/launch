import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PassStatus {
  hasActivePass: boolean;
  expiresAt: Date | null;
  plan: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
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
          stripeSubscriptionId: null,
        };
      }

      const { data, error } = await supabase
        .from('users')
        .select('plan, annual_access_expires_at, subscription_status, subscription_cancel_at_period_end, stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { 
          hasActivePass: false, 
          expiresAt: null, 
          plan: null,
          subscriptionStatus: null,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
        };
      }

      const expiresAt = data.annual_access_expires_at ? new Date(data.annual_access_expires_at) : null;
      
      // User has active pass if:
      // 1. They have annual_access plan AND valid expiry date AND expiry is in the future
      // 2. AND subscription_status is 'active' OR (status is null/inactive but expiry is valid - handles webhook delay)
      const hasValidExpiry = expiresAt !== null && expiresAt > new Date();
      const hasActivePlan = data.plan === 'annual_access';
      const hasActiveStatus = data.subscription_status === 'active';
      
      // Be lenient: if they have the plan and valid expiry, consider it active
      // This handles cases where the webhook hasn't updated subscription_status yet
      const hasActivePass = hasActivePlan && hasValidExpiry && (hasActiveStatus || data.subscription_status === 'inactive' || !data.subscription_status);

      return {
        hasActivePass,
        expiresAt,
        plan: data.plan,
        subscriptionStatus: data.subscription_status,
        cancelAtPeriodEnd: data.subscription_cancel_at_period_end ?? false,
        stripeSubscriptionId: data.stripe_subscription_id,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook to invalidate pass status cache - use after checkout success
export const useInvalidatePassStatus = () => {
  const queryClient = useQueryClient();
  return (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['pass', userId] });
  };
};
