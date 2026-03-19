import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AdvertiseCTAProps {
  className?: string;
}

const AdvertiseCTA = ({ className }: AdvertiseCTAProps) => {
  return (
    <div className={`w-full bg-muted/30 px-6 flex items-center aspect-[7/1] ${className || ''}`}>
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-semibold mb-1">Promote Your Product</h3>
          <p className="text-sm text-muted-foreground">
            From $99/mo · 3.2% CTR · 9x ROI
          </p>
        </div>
        <div className="shrink-0">
          <Button asChild className="gap-2">
            <Link to="/advertise">Get Started →</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvertiseCTA;
