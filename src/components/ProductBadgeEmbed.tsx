import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Download } from 'lucide-react';
import { toast } from 'sonner';

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
          text: '#313131',
          border: '#E5E5E5',
        };
      case 'neutral':
        return {
          bg: '#F5F5F5',
          text: '#313131',
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
          text: '#313131',
          border: '#FFD700',
        };
    }
  };

  const generateBasicBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const logoUrl = theme === 'dark' 
      ? 'https://trylaunch.ai/images/launch-badge-logo-white.png'
      : 'https://trylaunch.ai/images/launch-badge-logo.png';
    const badgeText = theme === 'gold' ? '#1 Product on' : 'Live on';
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 12px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <span style="font-size: 11px; font-weight: 600; letter-spacing: 0; opacity: 0.7;">${badgeText}</span>
  <img src="${logoUrl}" alt="Launch" height="28" style="display: block; height: 28px; width: auto;" />
</a>`;
  };

  const generateCategoryBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const logoUrl = theme === 'dark' 
      ? 'https://trylaunch.ai/images/launch-badge-logo-white.png'
      : 'https://trylaunch.ai/images/launch-badge-logo.png';
    const badgeText = theme === 'gold' ? '#1 Product on' : 'Live on';
    const categoryBorder = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme === 'gold' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)';
    const categoriesText = categories.slice(0, 2).join(' · ');
    
    return `<!-- Launch Badge - Embed this badge and get a dofollow backlink! -->
<a href="${productUrl}" target="_blank" rel="dofollow" style="display: inline-flex; flex-direction: column; align-items: flex-start; gap: 1px; padding: 6px 12px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <span style="font-size: 11px; font-weight: 600; letter-spacing: 0; opacity: 0.7;">${badgeText}</span>
  <div style="display: flex; align-items: center; gap: 10px;">
    <img src="${logoUrl}" alt="Launch" height="28" style="display: block; height: 28px; width: auto;" />
    ${categoriesText ? `<span style="padding: 2px 8px; background: transparent; border: 1px solid ${categoryBorder}; border-radius: 4px; font-size: 11px; font-weight: 500; letter-spacing: 0; opacity: 0.8; white-space: nowrap;">${categoriesText}</span>` : ''}
  </div>
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

  const renderPreview = (theme: BadgeTheme, withCategories: boolean, type: 'basic' | 'category') => {
    const styles = getThemeStyles(theme);
    const badgeText = theme === 'gold' ? '#1 Product on' : 'Live on';
    const logoSrc = theme === 'dark' ? '/images/launch-badge-logo-white.png' : '/images/launch-badge-logo.png';
    const refKey = `${type}-${theme}`;
    
    return (
      <div 
        ref={(el) => (badgeRefs.current[refKey] = el)}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '1px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: `1px solid ${styles.border}`,
          background: styles.bg,
          color: styles.text,
          ...(theme === 'gold' && { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' })
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0', opacity: 0.7 }}>{badgeText}</span>
        {withCategories && categories.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logoSrc} alt="Launch" style={{ display: 'block', height: '28px', width: 'auto' }} />
            <span 
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '500',
                letterSpacing: '0',
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : theme === 'gold' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0, 0, 0, 0.2)'}`,
                opacity: 0.8
              }}
            >
              {categories.slice(0, 2).join(' · ')}
            </span>
          </div>
        ) : (
          <img src={logoSrc} alt="Launch" style={{ display: 'block', height: '28px', width: 'auto' }} />
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
