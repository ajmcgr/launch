import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import launchIcon from '@/assets/launch-icon.png';

interface ProductBadgeEmbedProps {
  productSlug: string;
  productName: string;
  categories?: string[];
}

type BadgeTheme = 'light' | 'neutral' | 'dark';

const ProductBadgeEmbed = ({ productSlug, productName, categories = [] }: ProductBadgeEmbedProps) => {
  const [copiedBasic, setCopiedBasic] = useState<BadgeTheme | null>(null);
  const [copiedWithCategories, setCopiedWithCategories] = useState<BadgeTheme | null>(null);

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
    }
  };

  const generateBasicBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    return `<a href="${productUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s;">
  <img src="https://trylaunch.ai/src/assets/launch-icon.png" alt="Launch" width="20" height="20" style="display: block;" />
  <span>Support our Launch</span>
</a>`;
  };

  const generateCategoryBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const categoriesHTML = categories.slice(0, 3).map(cat => 
      `<span style="padding: 2px 8px; background: ${theme === 'dark' ? '#2A2A2A' : '#E5E5E5'}; color: ${styles.text}; border-radius: 12px; font-size: 11px; font-weight: 500;">${cat}</span>`
    ).join('');
    
    return `<a href="${productUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s;">
  <img src="https://trylaunch.ai/src/assets/launch-icon.png" alt="Launch" width="20" height="20" style="display: block;" />
  <span>Support our Launch</span>
  ${categoriesHTML ? `<span style="display: flex; gap: 4px; margin-left: 4px;">${categoriesHTML}</span>` : ''}
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

  const renderPreview = (theme: BadgeTheme, withCategories: boolean) => {
    const styles = getThemeStyles(theme);
    return (
      <div 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
        style={{
          background: styles.bg,
          color: styles.text,
          borderColor: styles.border,
        }}
      >
        <img src={launchIcon} alt="Launch" width="20" height="20" className="block" />
        <span className="text-sm font-medium">Support our Launch</span>
        {withCategories && categories.length > 0 && (
          <div className="flex gap-1.5 ml-2">
            {categories.slice(0, 3).map((cat) => (
              <span 
                key={cat} 
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: theme === 'dark' ? '#2A2A2A' : '#E5E5E5',
                  color: styles.text,
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 mt-4">
      <h3 className="text-lg font-semibold mb-4">Embeddable Launch Badges</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Copy and paste these badges on your website to drive traffic back to your launch.
      </p>

      {/* Basic Badge */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold mb-3">Basic Badge</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['light', 'neutral', 'dark'] as BadgeTheme[]).map((theme) => (
            <div key={theme} className="space-y-2">
              <div className="text-xs text-muted-foreground capitalize mb-2">{theme}</div>
              <div className="flex items-center justify-center p-4 rounded-lg border bg-muted/30 mb-2">
                {renderPreview(theme, false)}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => copyToClipboard(generateBasicBadgeHTML(theme), 'basic', theme)}
              >
                {copiedBasic === theme ? (
                  <>
                    <Check className="h-3 w-3 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Badge with Categories */}
      {categories.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Badge with Categories</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['light', 'neutral', 'dark'] as BadgeTheme[]).map((theme) => (
              <div key={theme} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">{theme}</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-muted/30 mb-2">
                  {renderPreview(theme, true)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => copyToClipboard(generateCategoryBadgeHTML(theme), 'category', theme)}
                >
                  {copiedWithCategories === theme ? (
                    <>
                      <Check className="h-3 w-3 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ProductBadgeEmbed;
