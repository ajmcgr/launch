import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdvertiseCTAProps {
  className?: string;
}

const AdvertiseCTA = ({ className }: AdvertiseCTAProps) => {
  return (
    <div className={`w-full bg-muted/30 px-5 py-5 space-y-3 ${className || ''}`}>
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Promote Your Product</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Get in front of 70K+ monthly visitors with sponsored listings & newsletter features.
      </p>
      <Button size="sm" className="w-full gap-2" asChild>
        <Link to="/advertise">Get Started →</Link>
      </Button>
      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>From $99/mo</span>
        <span>·</span>
        <span>3.2% CTR</span>
        <span>·</span>
        <span>9x ROI</span>
      </div>
    </div>
  );
};

export default AdvertiseCTA;
