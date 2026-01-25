import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Zap, TrendingUp, Mail, Calendar, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanFeatures {
  listing: boolean;
  socialPromotion: boolean;
  newsletter: boolean;
  chooseDate: boolean;
  badge: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: PlanFeatures;
  highlight?: boolean;
  badge?: string;
}

interface PlanComparisonCardProps {
  plan: Plan;
  isSelected: boolean;
  isDisabled?: boolean;
  isPaidPlan?: boolean;
  isCurrentPlan?: boolean;
  hasActivePass?: boolean;
  onClick: () => void;
}

const FEATURE_CONFIG = [
  { key: 'listing', label: 'Homepage listing', icon: TrendingUp },
  { key: 'socialPromotion', label: 'X & LinkedIn promotion', icon: Zap },
  { key: 'newsletter', label: 'Newsletter feature (2K+ subs)', icon: Mail },
  { key: 'chooseDate', label: 'Choose launch date', icon: Calendar },
  { key: 'badge', label: 'Verified badge', icon: Award },
] as const;

export const PlanComparisonCard = ({
  plan,
  isSelected,
  isDisabled = false,
  isCurrentPlan = false,
  hasActivePass = false,
  onClick,
}: PlanComparisonCardProps) => {
  const displayPrice = hasActivePass ? 0 : plan.price;
  
  return (
    <Card
      className={cn(
        'relative transition-all overflow-hidden',
        plan.highlight && !isDisabled && 'ring-2 ring-primary shadow-lg',
        isSelected && 'border-primary bg-primary/5',
        isCurrentPlan && 'border-primary ring-2 ring-primary',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/60 hover:shadow-md'
      )}
      onClick={() => !isDisabled && onClick()}
    >
      {/* Popular badge */}
      {plan.badge && !isDisabled && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
            {plan.badge}
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              {plan.name}
              {isCurrentPlan && (
                <Badge variant="secondary" className="text-xs">Your Plan</Badge>
              )}
              {isSelected && !isCurrentPlan && (
                <Badge variant="outline" className="text-xs">Selected</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              {hasActivePass && plan.price > 0 && (
                <span className="text-lg text-muted-foreground line-through">${plan.price}</span>
              )}
              <span className="text-3xl font-bold">${displayPrice}</span>
            </div>
            {hasActivePass && plan.price > 0 && (
              <span className="text-xs text-primary font-medium">Pass included</span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {FEATURE_CONFIG.map(({ key, label, icon: Icon }) => {
            const hasFeature = plan.features[key as keyof PlanFeatures];
            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                {hasFeature ? (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className={cn(!hasFeature && 'text-muted-foreground/60')}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        
        {/* Value callout for paid plans */}
        {plan.id === 'skip' && !isDisabled && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">70K+ impressions/month</span> • Best for maximum visibility
            </p>
          </div>
        )}
        {plan.id === 'join' && !isDisabled && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">5x more views</span> than free listings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
