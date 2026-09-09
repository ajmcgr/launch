import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Newspaper, Share2, Zap } from 'lucide-react';
import { trackUpgradeTrigger } from '@/lib/upgradeTracking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackFunnelEvent } from '@/lib/funnelTracking';

interface PostSubmissionUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  launchDate?: string;
}

const PostSubmissionUpgradeModal = ({ open, onClose, productId, productName, launchDate }: PostSubmissionUpgradeModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (open) {
      trackUpgradeTrigger(productId, 'post_submission', 'trigger_shown');
    }
  }, [open, productId]);

  const handleUpgradeClick = async () => {
    trackUpgradeTrigger(productId, 'post_submission', 'trigger_clicked');
    trackFunnelEvent('checkout_started', { plan: 'pro', source: 'post_submission' });
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again before upgrading.');

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { plan: 'skip', productId },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Could not start checkout.');
      window.location.assign(data.url);
    } catch (error: any) {
      console.error('Post-submission Pro checkout failed:', error);
      toast.error(error?.message || 'Could not start checkout. Please try again.');
      setIsLoading(false);
    }
  };

  const scheduledLabel = launchDate
    ? new Date(launchDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : 'the standard queue';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            <span className="font-semibold">{productName}</span> is scheduled for {scheduledLabel}
          </DialogTitle>
          <DialogDescription className="text-center">
            Keep your free launch, or add Pro promotion and priority scheduling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm font-medium text-center">Pro includes:</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <span><span className="font-medium">Priority scheduling</span> for your launch</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Rocket className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Priority placement on your launch day</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Newspaper className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Newsletter feature</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Share2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Promoted on X & LinkedIn the day you launch</span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            size="lg"
            onClick={handleUpgradeClick}
            disabled={isLoading}
          >
            {isLoading ? 'Starting checkout...' : 'Launch with Pro — $39'}
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-sm"
          >
            Keep my free launch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSubmissionUpgradeModal;
