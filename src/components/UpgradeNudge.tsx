import { Link } from 'react-router-dom';
import { TrendingUp, Megaphone, Mail, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpgradeNudgeProps {
  productName: string;
  currentPlan: string | null;
  productId: string;
}

const UpgradeNudge = ({ productName, currentPlan, productId }: UpgradeNudgeProps) => {
  // Only show for free or no-plan launches
  if (currentPlan && currentPlan !== 'free') return null;

  return (
    <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">
            Get more eyes on {productName}
          </p>
          <div className="flex flex-col gap-1 mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Megaphone className="h-3 w-3 text-muted-foreground/60" />
              <span>Not promoted on X & LinkedIn</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 text-muted-foreground/60" />
              <span>Not featured in newsletter (2K+ subs)</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="h-7 text-xs" asChild>
              <Link to="/advertise">
                <Zap className="h-3 w-3 mr-1" />
                Boost Visibility — from $9
              </Link>
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Pro launches get 3–5x more views
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeNudge;
