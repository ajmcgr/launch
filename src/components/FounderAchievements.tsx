import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getMilestone, type AchievementType } from '@/lib/milestones';
import MilestoneShareModal from './MilestoneShareModal';

interface Achievement {
  id: string;
  product_id: string;
  founder_id: string;
  achievement_type: string;
  metric_value: number | null;
  achieved_at: string;
  email_status: string;
}

interface Props {
  /** When provided, scope to a single founder (used on profile + dashboard). */
  founderId?: string;
  /** When provided, scope to a single product (used on product analytics). */
  productId?: string;
  /** Show share/email controls (dashboard mode). Default false (public profile mode). */
  showOwnerControls?: boolean;
  title?: string;
  emptyText?: string;
  limit?: number;
}

export default function FounderAchievements({
  founderId,
  productId,
  showOwnerControls = false,
  title = 'Achievements',
  emptyText,
  limit = 50,
}: Props) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [products, setProducts] = useState<Record<string, { name: string; slug: string; icon: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [active, setActive] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!founderId && !productId) return;
    const run = async () => {
      const sb = supabase as any;
      let q = sb
        .from('product_achievements')
        .select('id, product_id, founder_id, achievement_type, metric_value, achieved_at, email_status')
        .order('achieved_at', { ascending: false })
        .limit(limit);
      if (founderId) q = q.eq('founder_id', founderId);
      if (productId) q = q.eq('product_id', productId);
      const { data } = await q;
      const rows = (data || []) as Achievement[];
      setAchievements(rows);
      const ids = Array.from(new Set(rows.map((r) => r.product_id)));
      if (ids.length) {
        const { data: prods } = await sb
          .from('products')
          .select('id, name, slug')
          .in('id', ids);
        const { data: media } = await sb
          .from('product_media')
          .select('product_id, url, media_type')
          .in('product_id', ids)
          .eq('media_type', 'icon');
        const iconMap = new Map<string, string>();
        (media || []).forEach((m: any) => iconMap.set(m.product_id, m.url));
        const map: Record<string, { name: string; slug: string; icon: string | null }> = {};
        (prods || []).forEach((p: any) => {
          map[p.id] = { name: p.name, slug: p.slug, icon: iconMap.get(p.id) ?? null };
        });
        setProducts(map);
      }
      setLoading(false);
    };
    run();
  }, [founderId, productId, limit]);

  if (loading) return null;
  if (!achievements.length) {
    if (emptyText) {
      return (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3">{title}</h2>
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map((a) => {
          const meta = getMilestone(a.achievement_type as AchievementType);
          if (!meta) return null;
          const product = products[a.product_id];
          return (
            <Card key={a.id} className="p-4 flex items-start gap-3">
              <div className="text-2xl leading-none">{meta.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{meta.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {meta.metricLabel(a.metric_value ?? undefined)}
                </p>
                {product && (
                  <Link
                    to={`/launch/${product.slug}`}
                    className="text-xs text-primary hover:underline truncate block mt-1"
                  >
                    {product.name}
                  </Link>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(a.achieved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {showOwnerControls && (
                    <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                      {a.email_status === 'sent' ? (
                        <><CheckCircle2 className="h-3 w-3" /> emailed</>
                      ) : (
                        <><Mail className="h-3 w-3" /> {a.email_status}</>
                      )}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 px-2 text-xs gap-1"
                  onClick={() => { setActive(a); setModalOpen(true); }}
                >
                  <Share2 className="h-3 w-3" /> Share
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <MilestoneShareModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        achievement={active}
        product={active ? products[active.product_id] : null}
      />
    </div>
  );
}
