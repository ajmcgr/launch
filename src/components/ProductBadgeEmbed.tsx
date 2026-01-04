import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';
import badgeGolden from '@/assets/badge-golden.png';
import badgeNeutral from '@/assets/badge-neutral.png';
import badgeDark from '@/assets/badge-dark.png';

interface ProductBadgeEmbedProps {
  productSlug: string;
  productName: string;
  categories?: string[];
  wonDaily?: boolean;
  wonWeekly?: boolean;
  wonMonthly?: boolean;
}

type BadgeTheme = 'neutral' | 'dark' | 'gold';

const ProductBadgeEmbed = ({ productSlug, productName, categories = [], wonDaily = false, wonWeekly = false, wonMonthly = false }: ProductBadgeEmbedProps) => {
  const [copiedBasic, setCopiedBasic] = useState<BadgeTheme | null>(null);
  const [copiedWithCategories, setCopiedWithCategories] = useState<BadgeTheme | null>(null);
  const badgeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const productUrl = `https://trylaunch.ai/launch/${productSlug}`;

  const getThemeStyles = (theme: BadgeTheme) => {
    switch (theme) {
      case 'neutral':
        return {
          bg: '#FFFFFF',
          text: '#313131',
          border: '#E5E5E5',
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
          text: '#313131',
          border: '#FFD700',
        };
    }
  };

  const getBadgeImageUrl = (theme: BadgeTheme) => {
    switch (theme) {
      case 'gold':
        return 'https://trylaunch.ai/assets/badge-golden.png';
      case 'neutral':
        return 'https://trylaunch.ai/assets/badge-neutral.png';
      case 'dark':
        return 'https://trylaunch.ai/assets/badge-dark.png';
    }
  };

  const generateBasicBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const logoUrl = getBadgeImageUrl(theme);
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-block; padding: 8px 12px; background: ${styles.bg}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <img src="${logoUrl}" alt="Launch" height="36" style="display: block; height: 36px; width: auto;" />
</a>`;
  };

  const generateCategoryBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const logoUrl = getBadgeImageUrl(theme);
    const categoryBorder = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme === 'gold' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
    const categoriesText = categories.slice(0, 2).join(' · ');
    
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <img src="${logoUrl}" alt="Launch" height="36" style="display: block; height: 36px; width: auto;" />
  ${categoriesText ? `<span style="display: inline-block; height: 36px; line-height: 36px; font-size: 13px; font-weight: 500; letter-spacing: 0; opacity: 0.7; white-space: nowrap;">${categoriesText}</span>` : ''}
</a>`;
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

  const getBadgeImage = (theme: BadgeTheme) => {
    switch (theme) {
      case 'gold':
        return badgeGolden;
      case 'neutral':
        return badgeNeutral;
      case 'dark':
        return badgeDark;
    }
  };

  const renderPreview = (theme: BadgeTheme, withCategories: boolean, type: 'basic' | 'category') => {
    const styles = getThemeStyles(theme);
    const badgeSrc = getBadgeImage(theme);
    const refKey = `${type}-${theme}`;
    
    return (
      <div 
        ref={(el) => (badgeRefs.current[refKey] = el)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1px solid ${styles.border}`,
          background: styles.bg,
          color: styles.text,
          ...(theme === 'gold' && { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' })
        }}
      >
        <img src={badgeSrc} alt="Launch" style={{ display: 'block', height: '36px', width: 'auto' }} />
        {withCategories && categories.length > 0 && (
          <span 
            style={{
              display: 'inline-block',
              height: '36px',
              lineHeight: '36px',
              fontSize: '13px',
              fontWeight: '500',
              letterSpacing: '0',
              whiteSpace: 'nowrap',
              opacity: 0.7
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
      <p className="text-sm text-muted-foreground mb-4">
        Copy the embed code to add these badges to your website to get a dofollow backlink.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['neutral', 'dark'] as BadgeTheme[]).map((theme) => (
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
            {(['neutral', 'dark'] as BadgeTheme[]).map((theme) => (
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
