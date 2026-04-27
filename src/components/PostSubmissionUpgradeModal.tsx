import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, Newspaper, Share2, Zap } from 'lucide-react';
import { trackUpgradeTrigger } from '@/lib/upgradeTracking';

interface PostSubmissionUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

const PostSubmissionUpgradeModal = ({ open, onClose, productId, productName }: PostSubmissionUpgradeModalProps) => {
  useEffect(() => {
    if (open) {
      trackUpgradeTrigger(productId, 'post_submission', 'trigger_shown');
    }
  }, [open, productId]);

  const handleUpgradeClick = () => {
    trackUpgradeTrigger(productId, 'post_submission', 'trigger_clicked');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            <span className="font-semibold">{productName}</span> is queued for ~9 days
          </DialogTitle>
          <DialogDescription className="text-center">
            Free launches wait behind paid ones. By the time it goes live, the launch-day window has passed for most of your audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm font-medium text-center">Upgrade to Pro and launch today:</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <span><span className="font-medium">Skip the 9-day queue</span> — pick today or any date</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Rocket className="w-4 h-4 text-primary flex-shrink-0" />
              <span><span className="font-medium">~380 views</span> vs ~12 on Free (last 90 days avg)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Newspaper className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Featured in the newsletter — <span className="font-medium">2K+ subs, 25% open</span></span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Share2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Promoted on X & LinkedIn the day you launch</span>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground pt-1">
            8 of last week's top 10 launches were Pro.
          </p>

          <Button
            className="w-full h-12 text-base font-semibold"
            size="lg"
            asChild
            onClick={handleUpgradeClick}
          >
            <Link to="/pricing">
              Launch today — $39
            </Link>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-sm"
          >
            Keep waiting in the queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSubmissionUpgradeModal;
