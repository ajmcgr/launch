import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Linkedin, Copy, Check, ExternalLink } from 'lucide-react';

interface ShareLaunchModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productSlug: string;
  productTagline?: string;
}

const ShareLaunchModal = ({ open, onClose, productName, productSlug, productTagline }: ShareLaunchModalProps) => {
  const [copied, setCopied] = useState<string | null>(null);
  
  const productUrl = `https://trylaunch.ai/launch/${productSlug}`;
  
  const xShareText = `🚀 Just launched ${productName} on @trylaunchai!\n\n${productTagline || ''}\n\nCheck it out and show some love 👇\n${productUrl}`;
  
  const linkedInShareText = `🚀 Excited to announce: I just launched ${productName} on Launch!\n\n${productTagline || ''}\n\nWould love your support - check it out and let me know what you think!\n\n${productUrl}`;
  
  const ctaText = `🚀 Check out ${productName} on Launch - ${productUrl}`;
  

  const handleXShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xShareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };
  
  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };
  
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 Want more users?
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Shared launches get more visibility. Every share brings new founders to discover your product.
          </p>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Social Share Buttons */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Share on Social</h3>
            
            <Button 
              onClick={handleXShare}
              className="w-full justify-start gap-3 h-12 bg-black hover:bg-black/90 text-white"
            >
              <X className="w-5 h-5" />
              <span className="flex-1 text-left">Share on X (Twitter)</span>
              <ExternalLink className="w-4 h-4 opacity-50" />
            </Button>
            
            <Button 
              onClick={handleLinkedInShare}
              className="w-full justify-start gap-3 h-12 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white"
            >
              <Linkedin className="w-5 h-5" />
              <span className="flex-1 text-left">Share on LinkedIn</span>
              <ExternalLink className="w-4 h-4 opacity-50" />
            </Button>
          </div>
          
          {/* Copy-Paste CTA */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Copy-Paste CTA</h3>
            <div className="relative">
              <Textarea 
                value={ctaText}
                readOnly
                className="pr-12 resize-none bg-muted/50"
                rows={2}
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2"
                onClick={() => handleCopy(ctaText, 'cta')}
              >
                {copied === 'cta' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          
          {/* Encouragement */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-primary">
              ✨ Sharing increases visibility and helps other founders discover your product
            </p>
          </div>
          
          {/* Close Button */}
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLaunchModal;
