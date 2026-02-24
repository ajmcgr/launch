import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BoostUpsellModalProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

const BoostUpsellModal = ({ open, onClose, productId, productName }: BoostUpsellModalProps) => {
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in first');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: 'boost', productId },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Boost checkout error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Boost Your Launch
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-center text-muted-foreground text-sm">
            Get <span className="font-semibold text-foreground">{productName}</span> pinned to the top of the homepage for 24 hours.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Eye className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Featured at the top of the homepage</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
              <span>3–5x more visibility than standard listing</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Starts immediately after purchase</span>
            </div>
          </div>

          <div className="text-center pt-2">
            <span className="text-3xl font-bold">$19</span>
            <span className="text-sm text-muted-foreground ml-1">one-time</span>
          </div>

          <Button
            onClick={handleBoost}
            disabled={loading}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {loading ? 'Loading...' : '⚡ Boost for $19'}
          </Button>

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostUpsellModal;
