import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Linkedin, Mail, Copy, Check, X } from 'lucide-react';
import { CAMPAIGN_NAME, trackCampaignEvent } from '@/lib/campaign';
import { CAMPAIGN_ORIGIN } from '@/lib/campaignHost';
import type { BuilderWallProduct } from '@/hooks/use-campaign-products';
import defaultProductIcon from '@/assets/default-product-icon.png';

const CAMPAIGN_URL = CAMPAIGN_ORIGIN;

interface CampaignShareModalProps {
  product: BuilderWallProduct | null;
  onClose: () => void;
}

export const CampaignShareModal = ({ product, onClose }: CampaignShareModalProps) => {
  const [copied, setCopied] = useState(false);
  if (!product) return null;

  const launchUrl = `https://trylaunch.ai/launch/${product.slug}`;
  const founder = product.founder ? `@${product.founder}` : 'a Launch founder';
  const shareText = `${product.name} by ${founder} — built with AI and shipped on Launch.\n\nPart of ${CAMPAIGN_NAME}: ${CAMPAIGN_URL}\n\n${launchUrl}`;

  const share = (network: string, url: string) => {
    trackCampaignEvent('builder_wall_share_clicked', product.id);
    window.open(url, '_blank', 'width=600,height=520');
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Share this build</DialogTitle>
        </DialogHeader>

        {/* Share card preview */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-3">
            <img
              src={product.iconUrl || defaultProductIcon}
              alt={product.name}
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 rounded-xl object-cover bg-background"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = defaultProductIcon;
              }}
            />
            <div>
              <p className="font-reckless text-xl">{product.name}</p>
              {product.founder && (
                <p className="text-sm text-muted-foreground">by @{product.founder}</p>
              )}
            </div>
            {product.tagline && (
              <p className="text-sm text-muted-foreground line-clamp-2">{product.tagline}</p>
            )}
          </div>
          <div className="border-t px-5 py-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>{CAMPAIGN_NAME}</span>
            <span>Launch · vibecodedit.com</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              share('x', `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`)
            }
          >
            <X className="h-4 w-4" />
            <span className="text-xs">X</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              share(
                'linkedin',
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(launchUrl)}`
              )
            }
          >
            <Linkedin className="h-4 w-4 text-[#0A66C2]" />
            <span className="text-xs">LinkedIn</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() =>
              share(
                'email',
                `mailto:?subject=${encodeURIComponent(`${product.name} on Launch`)}&body=${encodeURIComponent(shareText)}`
              )
            }
          >
            <Mail className="h-4 w-4" />
            <span className="text-xs">Email</span>
          </Button>
        </div>

        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => {
            navigator.clipboard.writeText(shareText);
            setCopied(true);
            toast.success('Copied to clipboard');
            trackCampaignEvent('builder_wall_share_clicked', product.id);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          Copy share text
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignShareModal;
