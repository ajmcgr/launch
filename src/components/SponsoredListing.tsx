import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowUp, ExternalLink } from 'lucide-react';
import defaultProductIcon from '@/assets/default-product-icon.png';

interface SponsoredListingProps {
  name: string;
  tagline: string;
  slug: string;
  iconUrl?: string;
  domainUrl?: string;
}

export const SponsoredListing = ({
  name,
  tagline,
  slug,
  iconUrl,
  domainUrl,
}: SponsoredListingProps) => {
  return (
    <div className="group/card hover:bg-muted/30 transition-colors">
      <Link to={`/launch/${slug}`} className="block">
        <div className="flex items-start gap-3 py-3 px-2">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 overflow-hidden bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <img 
                src={iconUrl || defaultProductIcon} 
                alt={name} 
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = defaultProductIcon;
                }}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Link 
                to="/advertise" 
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors"
              >
                Sponsored
              </Link>
              <h3 className="font-semibold text-base hover:text-primary transition-colors">
                {name}
              </h3>
              {domainUrl && (
                <a
                  href={domainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/card:opacity-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
              {tagline}
            </p>
          </div>

          <div className="flex items-start self-start">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(`/launch/${slug}`, '_self');
              }}
              className="group flex flex-col items-center gap-0 h-auto py-0.5 px-2 min-w-[40px] transition-all touch-manipulation active:scale-95 [@media(hover:hover)]:hover:border-primary [@media(hover:hover)]:hover:bg-primary"
            >
              <ArrowUp className="h-3.5 w-3.5 [@media(hover:hover)]:group-hover:text-primary-foreground" />
              <span className="font-semibold text-xs [@media(hover:hover)]:group-hover:text-primary-foreground">—</span>
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
};