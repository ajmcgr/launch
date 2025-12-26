import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
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
    <div className="mb-2">
      <Link to={`/launch/${slug}`} className="block">
        <div className="group/card flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors cursor-pointer border-b">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img 
                src={iconUrl || defaultProductIcon} 
                alt={name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = defaultProductIcon;
                }}
              />
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
                <h3 className="font-semibold text-base text-foreground">
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
              <p className="text-sm text-muted-foreground line-clamp-1">{tagline}</p>
            </div>
          </div>
          <div className="flex items-start self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                window.open(`/launch/${slug}`, '_self');
              }}
              className="group flex items-center gap-1.5 h-8 px-3 hover:border-primary hover:bg-primary transition-all"
            >
              <span className="text-xs font-medium group-hover:text-primary-foreground">View</span>
            </Button>
          </div>
        </div>
      </Link>
    </div>
  );
};