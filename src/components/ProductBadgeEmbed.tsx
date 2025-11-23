import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
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
    const badgeText = theme === 'gold' ? '🏆 Top Product' : 'Support our Launch';
    return `<a href="${productUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <img src="${iconUrl}" alt="Launch" width="20" height="20" style="display: block;" />
  <span>${badgeText}</span>
</a>`;
  };

  const generateCategoryBadgeHTML = (theme: BadgeTheme) => {
    const styles = getThemeStyles(theme);
    const iconUrl = theme === 'dark' 
      ? 'https://trylaunch.ai/src/assets/launch-icon-light.png' 
      : 'https://trylaunch.ai/src/assets/launch-icon-dark.png';
    const badgeText = theme === 'gold' ? '🏆 Top Product' : 'Support our Launch';
    const categoryBg = theme === 'dark' ? '#2A2A2A' : theme === 'gold' ? 'rgba(255, 215, 0, 0.3)' : '#E5E5E5';
    const categoriesHTML = categories.slice(0, 3).map(cat => 
      `<span style="padding: 2px 8px; background: ${categoryBg}; color: ${styles.text}; border-radius: 12px; font-size: 11px; font-weight: 500;">${cat}</span>`
    ).join('');
    
    return `<a href="${productUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${styles.bg}; color: ${styles.text}; border: 1px solid ${styles.border}; border-radius: 8px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; font-weight: 500; transition: all 0.2s; ${theme === 'gold' ? 'box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);' : ''}">
  <img src="${iconUrl}" alt="Launch" width="20" height="20" style="display: block;" />
  <span>${badgeText}</span>
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
    const iconSrc = theme === 'dark' ? launchIconLight : launchIconDark;
    const badgeText = theme === 'gold' ? '🏆 Top Product' : 'Support our Launch';
    return (
      <div 
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all"
        style={{
          background: styles.bg,
          color: styles.text,
          borderColor: styles.border,
          ...(theme === 'gold' && { boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)' })
        }}
      >
        <img src={iconSrc} alt="Launch" width="20" height="20" className="block" />
        <span className="text-sm font-medium">{badgeText}</span>
        {withCategories && categories.length > 0 && (
          <div className="flex gap-1.5 ml-2">
            {categories.slice(0, 3).map((cat) => (
              <span 
                key={cat} 
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: theme === 'dark' ? '#2A2A2A' : theme === 'gold' ? 'rgba(255, 215, 0, 0.3)' : '#E5E5E5',
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

  const hasWon = wonDaily || wonWeekly || wonMonthly;
  const winnerLabel = wonDaily ? 'Daily' : wonWeekly ? 'Weekly' : wonMonthly ? 'Monthly' : '';

  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-base font-semibold mb-2">Embeddable Launch Badges</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Copy and paste these badges on your website to drive traffic back to your launch.
      </p>

      {/* Gold Winner Badge */}
      {hasWon && (
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏆</span>
            <h4 className="text-sm font-semibold text-yellow-900">Top {winnerLabel} Product Badge</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['gold'] as BadgeTheme[]).map((theme) => (
              <div key={`${theme}-basic`} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">Basic</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-white mb-2">
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
            {categories.length > 0 && (['gold'] as BadgeTheme[]).map((theme) => (
              <div key={`${theme}-category`} className="space-y-2">
                <div className="text-xs text-muted-foreground capitalize mb-2">With Categories</div>
                <div className="flex items-center justify-center p-4 rounded-lg border bg-white mb-2">
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

      {/* Basic Badge */}
      <div className="mb-6">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Basic Badge</h4>
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
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Badge with Categories</h4>
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
    </div>
  );
};

export default ProductBadgeEmbed;
