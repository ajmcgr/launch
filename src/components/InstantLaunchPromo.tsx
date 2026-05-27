import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  trackUpgradeTrigger,
  isDismissed,
  dismissTrigger,
  UpgradeTriggerType,
} from '@/lib/upgradeTracking';

interface InstantLaunchPromoProps {
  productId: string;
  productName?: string;
  variant: 'banner' | 'card';
  queuePosition?: number;
  estimatedDays?: number;
  dismissible?: boolean;
}

const InstantLaunchPromo = ({
  productId,
  productName,
  variant,
  queuePosition,
  estimatedDays,
  dismissible = true,
}: InstantLaunchPromoProps) => {
  const triggerType: UpgradeTriggerType =
    variant === 'banner' ? 'instant_launch_banner' : 'instant_launch_card';
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dismissible && isDismissed(triggerType, productId)) {
      setHidden(true);
      return;
    }
    trackUpgradeTrigger(productId, triggerType, 'trigger_shown');
  }, [productId, triggerType, dismissible]);

  if (hidden) return null;

  const handleClick = async () => {
    trackUpgradeTrigger(productId, triggerType, 'trigger_clicked');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { plan: 'annual_access', productId },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error('Instant launch checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    dismissTrigger(triggerType, productId);
    trackUpgradeTrigger(productId, triggerType, 'trigger_dismissed');
    setHidden(true);
  };

  if (variant === 'banner') {
    return (
      <div className="relative w-full rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <Rocket className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">🚀 Want visibility sooner?</p>
            <p className="text-xs text-muted-foreground">
              Skip the queue and launch instantly with Launch Pass.
              {queuePosition !== undefined && estimatedDays !== undefined && (
                <> Current position #{queuePosition} · ~{estimatedDays}-day wait.</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button size="sm" onClick={handleClick} disabled={loading}>
            {loading ? 'Loading…' : 'Launch Instantly'}
          </Button>
          {dismissible && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center gap-3 justify-between">
      <div className="flex items-start gap-2 min-w-0">
        <Rocket className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm">
          <span className="font-medium">Launch sooner</span>{productName ? ` — ${productName}` : ''} and start getting traffic today.
        </p>
      </div>
      <Button size="sm" onClick={handleClick} disabled={loading} className="flex-shrink-0">
        {loading ? '…' : 'Launch Instantly'}
      </Button>
    </div>
  );
};

export default InstantLaunchPromo;
