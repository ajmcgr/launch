import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, Download, Twitter, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { getMilestone, type AchievementType } from '@/lib/milestones';
import { supabase } from '@/integrations/supabase/client';

interface MilestoneShareCardProps {
  achievementId: string;
  achievementType: AchievementType | string;
  metricValue?: number | null;
  productName: string;
  productSlug: string;
  productIcon?: string | null;
  founderAvatar?: string | null;
  founderName?: string | null;
}

const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://trylaunch.ai';

export default function MilestoneShareCard({
  achievementId,
  achievementType,
  metricValue,
  productName,
  productSlug,
  productIcon,
  founderAvatar,
  founderName,
}: MilestoneShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const meta = getMilestone(achievementType);
  if (!meta) return null;

  const shareUrl = `${SITE}/achievement/${achievementId}`;
  const productUrl = `${SITE}/launch/${productSlug}`;
  const shareText = meta.shareText(productName, shareUrl);

  const trackShare = async () => {
    try {
      const sb = supabase as any;
      const { data } = await sb
        .from('product_achievements')
        .select('share_count')
        .eq('id', achievementId)
        .maybeSingle();
      const current = data?.share_count ?? 0;
      await sb
        .from('product_achievements')
        .update({ share_count: current + 1 })
        .eq('id', achievementId);
    } catch {
      /* non-blocking */
    }
  };

  const onX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener'
    );
    trackShare();
  };
  const onLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener'
    );
    trackShare();
  };
  const onCopy = async () => {
    await navigator.clipboard.writeText(`${shareText}`);
    toast.success('Copied to clipboard');
    trackShare();
  };
  const onDownload = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${productSlug}-${achievementType}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      trackShare();
    } catch (e) {
      console.error(e);
      toast.error('Could not generate image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl">
        <div
          ref={cardRef}
          className="relative w-full aspect-[1200/630] bg-gradient-to-br from-primary/20 via-background to-background p-8 flex flex-col justify-between"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {productIcon ? (
                <img
                  src={productIcon}
                  alt=""
                  crossOrigin="anonymous"
                  className="w-16 h-16 rounded-2xl object-cover border border-border"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-2xl">
                  {meta.emoji}
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Milestone on Launch</p>
                <p className="text-xl font-bold leading-tight">{productName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">trylaunch.ai</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center -mt-4">
            <div className="text-5xl mb-2">{meta.emoji}</div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{meta.title}</h2>
            <p className="mt-2 text-base md:text-lg text-muted-foreground">
              {meta.metricLabel(metricValue ?? undefined)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            {founderName ? (
              <div className="flex items-center gap-2">
                {founderAvatar && (
                  <img
                    src={founderAvatar}
                    alt=""
                    crossOrigin="anonymous"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-muted-foreground">by {founderName}</span>
              </div>
            ) : <span />}
            <span className="text-sm font-semibold tracking-tight">
              🚀 Launch
            </span>
          </div>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={onX} className="gap-2">
          <Twitter className="h-4 w-4" /> Share on X
        </Button>
        <Button size="sm" variant="outline" onClick={onLinkedIn} className="gap-2">
          <Linkedin className="h-4 w-4" /> LinkedIn
        </Button>
        <Button size="sm" variant="outline" onClick={onCopy} className="gap-2">
          <Copy className="h-4 w-4" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={onDownload} disabled={busy} className="gap-2">
          <Download className="h-4 w-4" /> {busy ? 'Generating…' : 'Download'}
        </Button>
      </Card>
    </div>
  );
}
