import { useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BoostNudgeCardProps {
  productId: string;
  productName: string;
  rank?: number;
}

const BoostNudgeCard = ({ productId, productName, rank }: BoostNudgeCardProps) => {
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
    <div className="mt-3 flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
      <Zap className="h-4 w-4 text-primary flex-shrink-0" />
      <p className="text-sm text-muted-foreground flex-1">
        {rank && rank > 3
          ? <>You're currently <span className="font-semibold text-foreground">#{rank}</span>. Boost to reach more users.</>
          : <>Boost <span className="font-semibold text-foreground">{productName}</span> to the top for 24 hours.</>
        }
      </p>
      <Button
        size="sm"
        className="h-7 text-xs flex-shrink-0"
        onClick={handleBoost}
        disabled={loading}
      >
        <Zap className="h-3 w-3 mr-1" />
        {loading ? 'Loading...' : 'Boost now'}
      </Button>
    </div>
  );
};

export default BoostNudgeCard;
