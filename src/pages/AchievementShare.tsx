import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { getMilestone } from '@/lib/milestones';
import MilestoneShareCard from '@/components/MilestoneShareCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function AchievementShare() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: a } = await supabase
        .from('product_achievements' as any)
        .select('id, product_id, founder_id, achievement_type, metric_value, achieved_at')
        .eq('id', id)
        .maybeSingle();
      if (!a) { setLoading(false); return; }
      const ach = a as any;
      const [{ data: product }, { data: media }, { data: founder }] = await Promise.all([
        supabase.from('products').select('id, name, slug, tagline').eq('id', ach.product_id).maybeSingle(),
        supabase.from('product_media').select('url').eq('product_id', ach.product_id).eq('media_type', 'icon').limit(1).maybeSingle(),
        supabase.from('users').select('id, name, username, avatar_url').eq('id', ach.founder_id).maybeSingle(),
      ]);
      setData({
        achievement: ach,
        product: product ? { ...product, icon: (media as any)?.url ?? null } : null,
        founder,
      });
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Skeleton className="aspect-[1200/630] w-full" />
      </div>
    );
  }

  if (!data?.achievement || !data?.product) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-lg font-semibold">Achievement not found</p>
        <Link to="/" className="text-primary hover:underline text-sm">Back to Launch</Link>
      </div>
    );
  }

  const meta = getMilestone(data.achievement.achievement_type);
  const title = meta ? `${data.product.name} — ${meta.title} on Launch` : `${data.product.name} on Launch`;
  const desc = meta ? `${data.product.name} just achieved ${meta.title} on Launch.` : '';

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
      </Helmet>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Milestone unlocked on Launch</p>
          <h1 className="text-2xl font-bold">{data.product.name}</h1>
        </div>
        <MilestoneShareCard
          achievementId={data.achievement.id}
          achievementType={data.achievement.achievement_type}
          metricValue={data.achievement.metric_value}
          productName={data.product.name}
          productSlug={data.product.slug}
          productIcon={data.product.icon}
          founderAvatar={data.founder?.avatar_url}
          founderName={data.founder?.name || data.founder?.username}
        />
        <div className="text-center">
          <Link to={`/launch/${data.product.slug}`} className="text-sm text-primary hover:underline">
            View {data.product.name} on Launch →
          </Link>
        </div>
      </div>
    </>
  );
}
