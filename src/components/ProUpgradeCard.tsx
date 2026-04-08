import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Eye, AlertTriangle, X, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  UpgradeTriggerType,
  trackUpgradeTrigger,
  isDismissed,
  dismissTrigger,
} from '@/lib/upgradeTracking';

interface ProUpgradeCardProps {
  productId: string;
  productName: string;
  triggerType: UpgradeTriggerType;
  rank?: number;
  countdown?: string;
  /** Compact inline variant vs. prominent card */
  variant?: 'inline' | 'card';
}

const TRIGGER_CONFIG: Record<UpgradeTriggerType, {
  icon: typeof TrendingUp;
  getTitle: (props: ProUpgradeCardProps) => string;
  getMessage: (props: ProUpgradeCardProps) => string;
  cta: string;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}> = {
  low_rank: {
    icon: AlertTriangle,
    getTitle: (p) => `You're ranked #${p.rank || '—'}`,
    getMessage: () => 'Most traffic goes to the top 5 launches. Upgrade to increase your visibility.',
    cta: 'Improve your position — $39',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
  },
  live_window: {
    icon: Clock,
    getTitle: () => 'Your launch window is active',
    getMessage: () => 'This is when most users discover new products. Upgrade now to maximise visibility while it matters.',
    cta: 'Boost your launch — $39',
    borderColor: 'border-green-500/20',
    bgColor: 'bg-green-500/5',
    iconColor: 'text-green-500',
  },
  low_traction: {
    icon: Eye,
    getTitle: () => 'Not getting much traction yet',
    getMessage: () => 'Most successful launches get visibility early. Upgrade to increase exposure.',
    cta: 'Get more visibility — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  post_submission: {
    icon: Rocket,
    getTitle: () => 'Your launch is queued',
    getMessage: () => 'Most traffic happens in the first 24 hours. Right now, your product is not getting visibility. Upgrade to go live faster and get featured.',
    cta: 'Launch properly — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  product_detail_sidebar: {
    icon: TrendingUp,
    getTitle: (p) => `Get more eyes on ${p.productName}`,
    getMessage: () => 'Pro launches get featured in our newsletter (2K+ subs) and promoted on social media.',
    cta: 'Upgrade to Pro — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
};

const ProUpgradeCard = (props: ProUpgradeCardProps) => {
  const { productId, triggerType, variant = 'card' } = props;
  const [dismissed, setDismissed] = useState(false);

  const config = TRIGGER_CONFIG[triggerType];
  const Icon = config.icon;

  useEffect(() => {
    if (isDismissed(triggerType, productId)) {
      setDismissed(true);
      return;
    }
    trackUpgradeTrigger(productId, triggerType, 'trigger_shown');
  }, [productId, triggerType]);

  if (dismissed) return null;

  const handleDismiss = () => {
    dismissTrigger(triggerType, productId);
    setDismissed(true);
    trackUpgradeTrigger(productId, triggerType, 'trigger_dismissed');
  };

  const handleClick = () => {
    trackUpgradeTrigger(productId, triggerType, 'trigger_clicked');
  };

  if (variant === 'inline') {
    return (
      <div className={`mt-3 flex items-center gap-3 p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.iconColor} flex-shrink-0`} />
        <p className="text-sm text-muted-foreground flex-1">
          {config.getMessage(props)}
        </p>
        <Button size="sm" className="h-7 text-xs flex-shrink-0" asChild onClick={handleClick}>
          <Link to="/pricing">{config.cta}</Link>
        </Button>
        <button onClick={handleDismiss} className="text-muted-foreground/50 hover:text-muted-foreground p-0.5">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor} space-y-2 relative`}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-muted-foreground/50 hover:text-muted-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
        <p className="text-sm font-semibold">{config.getTitle(props)}</p>
      </div>
      <p className="text-xs text-muted-foreground pr-4">
        {config.getMessage(props)}
      </p>
      <Button size="sm" className="w-full mt-2" asChild onClick={handleClick}>
        <Link to="/pricing">{config.cta}</Link>
      </Button>
    </div>
  );
};

export default ProUpgradeCard;
