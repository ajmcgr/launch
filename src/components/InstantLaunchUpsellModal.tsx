import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Zap, TrendingUp, Eye, MousePointer, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackUpgradeTrigger } from '@/lib/upgradeTracking';

interface InstantLaunchUpsellModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  queuePosition?: number;
  estimatedDays?: number;
}

function formatStat(n: number): string {
  if (n < 100) return `${n}`;
  if (n < 1000) return `${Math.floor(n / 100) * 100}+`;
  if (n < 1_000_000) return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}K+`;
  return `${(n / 1_000_000).toFixed(1)}M+`;
}

const usePlatformStats = (enabled: boolean) =>
  useQuery({
    enabled,
    queryKey: ['instant-launch-platform-stats'],
    queryFn: async () => {
      const [productsRes, usersRes, clicksRes] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'launched'),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('product_analytics_summary').select('total_website_clicks'),
      ]);
      const totalClicks = (clicksRes.data ?? []).reduce(
        (sum, row: any) => sum + (row.total_website_clicks ?? 0),
        0
      );
      return {
        launched: productsRes.count ?? 0,
        makers: usersRes.count ?? 0,
        clicks: totalClicks,
      };
    },
    staleTime: 1000 * 60 * 30,
  });

const InstantLaunchUpsellModal = ({
  open,
  onClose,
  productId,
  productName,
  queuePosition,
  estimatedDays,
}: InstantLaunchUpsellModalProps) => {
  const [loading, setLoading] = useState(false);
  const { data: stats } = usePlatformStats(open);

  useEffect(() => {
    if (open) trackUpgradeTrigger(productId, 'instant_launch_modal', 'trigger_shown');
  }, [open, productId]);

  const handleCheckout = async () => {
    trackUpgradeTrigger(productId, 'instant_launch_modal', 'trigger_clicked');
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
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Instant launch checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    trackUpgradeTrigger(productId, 'instant_launch_modal', 'trigger_dismissed');
    onClose();
  };

  const statItems = stats
    ? [
        { label: 'makers', value: stats.makers },
        { label: 'products launched', value: stats.launched },
        ...(stats.clicks > 0 ? [{ label: 'clicks sent', value: stats.clicks }] : []),
      ].filter((s) => s.value > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Rocket className="w-6 h-6 text-primary" />
            Launch Instantly
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium text-foreground">{productName}</span> has been submitted and added to the queue.
            Skip the wait and start getting visibility today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {(queuePosition || estimatedDays) && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm flex items-center justify-between">
              {queuePosition !== undefined && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>
                    Position <span className="font-semibold text-foreground">#{queuePosition}</span>
                  </span>
                </div>
              )}
              {estimatedDays !== undefined && (
                <div className="text-muted-foreground">
                  ~<span className="font-semibold text-foreground">{estimatedDays} days</span> wait
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Launch immediately instead of waiting in the queue</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Priority placement across Launch</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Eye className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Increased visibility to founders and early adopters</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MousePointer className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>More impressions and clicks during launch week</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Rocket className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Included with Launch Pass</span>
            </div>
          </div>

          {statItems.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-center text-muted-foreground mb-2">
                Join hundreds of founders using Launch to get discovered.
              </p>
              <div className="flex items-center justify-center gap-x-5 gap-y-1 flex-wrap text-xs text-muted-foreground">
                {statItems.map((s) => (
                  <div key={s.label} className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{formatStat(s.value)}</span>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {loading ? 'Loading…' : '🚀 Launch Instantly'}
          </Button>

          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-sm"
          >
            Stay in Queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstantLaunchUpsellModal;
