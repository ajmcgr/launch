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
            Your launch is queued — not live yet
          </DialogTitle>
          <DialogDescription className="text-center">
            Most traffic happens in the first 24 hours of a launch.
            Right now, <span className="font-semibold text-foreground">{productName}</span> is not getting visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm font-medium text-center">Upgrade to Pro to:</p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Go live faster</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Rocket className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Appear on the homepage feed</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Newspaper className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Get featured in our newsletter (2K+ subs)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Share2 className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Social media promotion on X & LinkedIn</span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base font-semibold"
            size="lg"
            asChild
            onClick={handleUpgradeClick}
          >
            <Link to="/pricing">
              Launch properly — $39
            </Link>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-sm"
          >
            Keep as queued launch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostSubmissionUpgradeModal;
