import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import launchIconLight from '@/assets/launch-icon-light.png';
import launchIconDark from '@/assets/launch-icon-dark.png';

interface ProductBadgeEmbedProps {
  productSlug: string;
  productName: string;
  categories?: string[];
  wonDaily?: boolean;
  wonWeekly?: boolean;
  wonMonthly?: boolean;
}

type BadgeTheme = 'light' | 'neutral' | 'dark' | 'gold';

const ProductBadgeEmbed = ({ productSlug, productName, categories = [], wonDaily = false, wonWeekly = false, wonMonthly = false }: ProductBadgeEmbedProps) => {
  const [copiedBasic, setCopiedBasic] = useState<BadgeTheme | null>(null);
  const [copiedWithCategories, setCopiedWithCategories] = useState<BadgeTheme | null>(null);
  const badgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const productUrl = `https://trylaunch.ai/launch/${productSlug}`;

  const getThemeStyles = (theme: BadgeTheme) => {
    switch (theme) {
      case 'light':
        return {
          bg: '#FFFFFF',
          text: '#1A1A1A',
          border: '#E5E5E5',
        };
      case 'neutral':
        return {
          bg: '#F5F5F5',
          text: '#1A1A1A',
          border: '#D4D4D4',
        };
      case 'dark':
        return {
          bg: '#1A1A1A',
          text: '#FFFFFF',
          border: '#333333',
        };
      case 'gold':
        return {
          bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          text: '#1A1A1A',
          border: '#FFD700',
        };
    }
  };

  const generateBasicBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const iconUrl = theme === 'dark' 
      ? 'https://trylaunch.ai/src/assets/launch-icon-light.png' 
      : 'https://trylaunch.ai/src/assets/launch-icon-dark.png';
    const badgeText = theme === 'gold' ? '#1 Product on Launch' : 'Live on Launch';
    const trylaunchUrl = `https://trylaunch.ai?ref=${productSlug}`;
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<div style="display: inline-flex; flex-direction: column; gap: 8px; align-items: flex-start;">
  <a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
    <img src="${iconUrl}" alt="Launch" width="20" height="20" style="display: block;" />
    <span>${badgeText}</span>
  </a>
  <a href="${trylaunchUrl}" target="_blank" rel="dofollow" style="font-size: 11px; color: #666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    Powered by <span style="font-weight: 600;">Launch</span>
  </a>
</div>`;
  };

  const generateCategoryBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const iconUrl = theme === 'dark' 
      ? 'https://trylaunch.ai/src/assets/launch-icon-light.png' 
      : 'https://trylaunch.ai/src/assets/launch-icon-dark.png';
    const badgeText = theme === 'gold' ? '#1 Product on Launch' : 'Live on Launch';
    const categoryBorder = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme === 'gold' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
    const categoriesText = categories.slice(0, 2).join(' · ');
    const trylaunchUrl = `https://trylaunch.ai?ref=${productSlug}`;
    
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<div style="display: inline-flex; flex-direction: column; gap: 8px; align-items: flex-start;">
  <a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
    <div style="display: flex; align-items: center; gap: 8px;">
      <img src="${iconUrl}" alt="Launch" width="20" height="20" style="display: block;" />
      <span style="white-space: nowrap;">${badgeText}</span>
    </div>
    ${categoriesText ? `<span style="padding: 2px 10px; background: transparent; border: 1px solid ${categoryBorder}; border-radius: 4px; font-size: 12px; font-weight: 500; opacity: 0.9; white-space: nowrap;">${categoriesText}</span>` : ''}
  </a>
  <a href="${trylaunchUrl}" target="_blank" rel="dofollow" style="font-size: 11px; color: #666; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    Powered by <span style="font-weight: 600;">Launch</span>
  </a>
</div>`;
  };

  const copyToClipboard = (html: string, type: 'basic' | 'category', theme: BadgeTheme) => {
    navigator.clipboard.writeText(html);
    if (type === 'basic') {
      setCopiedBasic(theme);
      setTimeout(() => setCopiedBasic(null), 2000);
    } else {
      setCopiedWithCategories(theme);
      setTimeout(() => setCopiedWithCategories(null), 2000);
    }
    toast.success('Embed code copied to clipboard!');
  };

  const downloadAsImage = async (type: 'basic' | 'category', theme: BadgeTheme) => {
    const refKey = `${type}-${theme}`;
    const element = badgeRefs.current[refKey];
    
    if (!element) {
      toast.error('Failed to capture badge');
      return;
    }

    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale: 3,
      });
      
      const link = document.createElement('a');
      link.download = `${productName.replace(/\s+/g, '-')}-badge-${theme}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Badge downloaded as image!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to download badge');
    }
  };

  const renderPreview = (theme: BadgeTheme, withCategories: boolean, type: 'basic' | 'category') => {
    const styles = getThemeStyles(theme);
    const iconSrc = theme === 'dark' ? launchIconLight : launchIconDark;
    const badgeText = theme === 'gold' ? '#1 Product on Launch' : 'Live on Launch';
    const refKey = `${type}-${theme}`;
    
    return (
      <div 
        ref={(el) => (badgeRefs.current[refKey] = el)}
        className="inline-flex flex-wrap items-center gap-2 px-4 py-2 rounded-lg border transition-all"
        style={{
          background: styles.bg,
          color: styles.text,
          borderColor: styles.border,
          ...(theme === 'gold' && { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' })
        }}
      >
        <div className="flex items-center gap-2">
          <img src={iconSrc} alt="Launch" width="20" height="20" className="block" />
          <span className="text-sm font-medium whitespace-nowrap">{badgeText}</span>
        </div>
        {withCategories && categories.length > 0 && (
          <span 
            className="px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap"
            style={{
              background: 'transparent',
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme === 'gold' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
              opacity: 0.9
            }}
          >
            {categories.slice(0, 2).join(' · ')}
          </span>
        )}
      </div>
    );
  };

  const hasWon = wonDaily || wonWeekly || wonMonthly;

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-base font-semibold mb-2">Embeddable Launch Badges</h3>
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium mb-2">🎁 Get a Dofollow Backlink!</p>
        <p className="text-xs text-muted-foreground">
          Embed this badge with a dofollow link to Launch on your website and we'll give your product a dofollow backlink. 
          Great for SEO! Once embedded, verify your badge to activate the backlink.
        </p>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Copy the embed code to add these badges to your website.
      </p>

      {hasWon && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Top Product Badge</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['gold'] as BadgeTheme[]).map((theme) => (
              <div key={`${theme}-basic`} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">Basic</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-white mb-2">
                  {renderPreview(theme, false, 'basic')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(generateBasicBadgeHTML(theme), 'basic', theme)}
                  >
                    {copiedBasic === theme ? <><Check className="h-3 w-3 mr-2" />Copied!</> : <><Copy className="h-3 w-3 mr-2" />Copy</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadAsImage('basic', theme)}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Image
                  </Button>
                </div>
              </div>
            ))}
            {categories.length > 0 && (['gold'] as BadgeTheme[]).map((theme) => (
              <div key={`${theme}-category`} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">With Categories</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-white mb-2">
                  {renderPreview(theme, true, 'category')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(generateCategoryBadgeHTML(theme), 'category', theme)}
                  >
                    {copiedWithCategories === theme ? <><Check className="h-3 w-3 mr-2" />Copied!</> : <><Copy className="h-3 w-3 mr-2" />Copy</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadAsImage('category', theme)}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Image
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Basic Badge</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['light', 'neutral', 'dark'] as BadgeTheme[]).map((theme) => (
            <div key={theme} className="space-y-2">
              <div className="text-xs text-muted-foreground capitalize mb-2">{theme}</div>
              <div className="flex items-center justify-center p-4 rounded-lg border bg-muted/30 mb-2">
                {renderPreview(theme, false, 'basic')}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => copyToClipboard(generateBasicBadgeHTML(theme), 'basic', theme)}
                >
                  {copiedBasic === theme ? <><Check className="h-3 w-3 mr-2" />Copied!</> : <><Copy className="h-3 w-3 mr-2" />Copy</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadAsImage('basic', theme)}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Image
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Badge with Categories</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['light', 'neutral', 'dark'] as BadgeTheme[]).map((theme) => (
              <div key={theme} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">{theme}</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-muted/30 mb-2">
                  {renderPreview(theme, true, 'category')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => copyToClipboard(generateCategoryBadgeHTML(theme), 'category', theme)}
                  >
                    {copiedWithCategories === theme ? <><Check className="h-3 w-3 mr-2" />Copied!</> : <><Copy className="h-3 w-3 mr-2" />Copy</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadAsImage('category', theme)}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Image
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBadgeEmbed;
