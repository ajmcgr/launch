import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvertiseCTAProps {
  className?: string;
}

const AdvertiseCTA = ({ className }: AdvertiseCTAProps) => {
  return (
    <div className={`rounded-lg border bg-card p-4 space-y-3 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Megaphone className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-sm">Promote Your Product</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Get your product in front of 70K+ monthly visitors. Sponsored listings, newsletter features & more.
      </p>
      <div className="flex flex-col gap-2">
        <Button size="sm" className="w-full" asChild>
          <Link to="/advertise">View Packages →</Link>
        </Button>
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <span>From $99/mo</span>
          <span>·</span>
          <span>3.2% CTR</span>
          <span>·</span>
          <span>9x ROI</span>
        </div>
      </div>
    </div>
  );
};

export default AdvertiseCTA;
