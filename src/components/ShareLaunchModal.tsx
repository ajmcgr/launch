import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Linkedin, Copy, Check, ExternalLink } from 'lucide-react';

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

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
  
  const redditTitle = `🚀 Just launched ${productName}${productTagline ? ` - ${productTagline}` : ''}`;
  
  const ctaText = `🚀 Check out ${productName} on Launch - ${productUrl}`;
  

  const handleXShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xShareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };
  
  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
  };
  
  const handleRedditShare = () => {
    const url = `https://www.reddit.com/submit?url=${encodeURIComponent(productUrl)}&title=${encodeURIComponent(redditTitle)}`;
    window.open(url, '_blank', 'width=550,height=620');
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
            
            <Button 
              onClick={handleRedditShare}
              className="w-full justify-start gap-3 h-12 bg-[#FF4500] hover:bg-[#FF4500]/90 text-white"
            >
              <RedditIcon className="w-5 h-5" />
              <span className="flex-1 text-left">Share on Reddit</span>
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
