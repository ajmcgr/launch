import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, Eye, AlertTriangle, X, Rocket, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
    getTitle: (p) => `You're ranked #${p.rank || '—'} — top 5 gets ~80% of clicks`,
    getMessage: () => 'Pro launches average 4x more upvotes and get featured in the newsletter (2K+ subs).',
    cta: 'Move up the leaderboard — $39',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    iconColor: 'text-amber-500',
  },
  live_window: {
    icon: Zap,
    getTitle: () => 'Your 24h launch window is live now',
    getMessage: () => 'This is when ~70% of launch-day traffic happens. Boost pins you to the top for the next 24h.',
    cta: 'Boost while it matters — $19',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },

  low_traction: {
    icon: Eye,
    getTitle: () => 'Free launches average ~12 views in 24h',
    getMessage: () => 'Pro launches average ~380 views and 4x more upvotes. Newsletter feature alone reaches 2K+ subs.',
    cta: 'Get real visibility — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  post_submission: {
    icon: Rocket,
    getTitle: () => 'Free launches wait ~9 days in queue',
    getMessage: () => 'Pro skips the queue (launch today), gets featured in the newsletter (2K+ subs), and posted on X & LinkedIn. 8 of last week\'s top 10 were Pro.',
    cta: 'Launch today — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  product_detail_sidebar: {
    icon: TrendingUp,
    getTitle: (p) => `${p.productName}: 4x more upvotes with Pro`,
    getMessage: () => 'Newsletter feature (2K+ subs) + X & LinkedIn posts. Pro launches consistently fill last week\'s top 10.',
    cta: 'Upgrade to Pro — $39',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  instant_launch_modal: {
    icon: Rocket,
    getTitle: () => 'Launch Instantly',
    getMessage: () => 'Skip the queue and start getting visibility today with Launch Pass.',
    cta: '🚀 Launch Instantly',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  instant_launch_banner: {
    icon: Rocket,
    getTitle: () => 'Want visibility sooner?',
    getMessage: () => 'Skip the queue and launch instantly with Launch Pass.',
    cta: 'Launch Instantly',
    borderColor: 'border-primary/20',
    bgColor: 'bg-primary/5',
    iconColor: 'text-primary',
  },
  instant_launch_card: {
    icon: Rocket,
    getTitle: () => 'Launch sooner and start getting traffic today',
    getMessage: () => 'Included with Launch Pass — unlimited launches, priority placement.',
    cta: 'Launch Instantly',
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
