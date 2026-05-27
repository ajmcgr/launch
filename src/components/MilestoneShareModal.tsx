import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MilestoneShareCard from './MilestoneShareCard';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement: {
    id: string;
    achievement_type: string;
    metric_value: number | null;
  } | null;
  product: {
    name: string;
    slug: string;
    icon?: string | null;
  } | null;
  founder?: {
    name?: string | null;
    avatar?: string | null;
  };
}

export default function MilestoneShareModal({ open, onOpenChange, achievement, product, founder }: Props) {
  if (!achievement || !product) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share your milestone</DialogTitle>
        </DialogHeader>
        <MilestoneShareCard
          achievementId={achievement.id}
          achievementType={achievement.achievement_type}
          metricValue={achievement.metric_value ?? undefined}
          productName={product.name}
          productSlug={product.slug}
          productIcon={product.icon}
          founderAvatar={founder?.avatar ?? null}
          founderName={founder?.name ?? null}
        />
      </DialogContent>
    </Dialog>
  );
}
