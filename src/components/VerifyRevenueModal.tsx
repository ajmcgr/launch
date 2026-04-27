import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, TrendingUp, BadgeCheck } from 'lucide-react';

interface VerifyRevenueModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
}

const VerifyRevenueModal = ({ open, onClose, productName }: VerifyRevenueModalProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Verify {productName}'s revenue
          </DialogTitle>
          <DialogDescription className="text-center">
            Already making money on Stripe? Connect in 30 seconds to unlock the Verified Revenue leaderboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Verified MRR badge on your product page</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Rank on the Revenue leaderboard (verified-only)</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Read-only — we never charge or access customers</span>
            </div>
          </div>

          <Button className="w-full h-12 text-base font-semibold" size="lg" asChild>
            <Link to="/settings?tab=integrations" onClick={onClose}>
              Connect Stripe
            </Link>
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground text-sm"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerifyRevenueModal;
