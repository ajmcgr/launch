import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface HomeLaunchListItemProps {
  rank: number;
  name: string;
  tagline: string;
  icon: any;
  votes: number;
  slug: string;
  domainUrl?: string;
  userVote?: 1 | null;
  onVote: () => void;
}

export const HomeLaunchListItem = ({
  rank,
  name,
  tagline,
  icon: IconComponent,
  votes,
  slug,
  domainUrl,
  userVote,
  onVote,
}: HomeLaunchListItemProps) => {
  return (
    <Link to={`/launch/${slug}`} className="block">
      <div 
        className="flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors cursor-pointer"
      >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-sm font-bold text-muted-foreground w-5">
          {rank}.
        </span>
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-sm text-foreground">
              {name}
            </h3>
            {domainUrl && (
              <a
                href={domainUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{tagline}</p>
        </div>
      </div>
      <div className="flex items-start self-start">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            onVote();
          }}
          className={`group flex flex-col items-center gap-0 h-auto py-0.5 px-2 min-w-[40px] hover:border-primary hover:bg-primary transition-all ${userVote === 1 ? 'border-primary' : ''}`}
        >
          <span className="text-xs group-hover:text-primary-foreground">▲</span>
          <span className="font-semibold text-xs group-hover:text-primary-foreground">{votes}</span>
        </Button>
      </div>
      </div>
    </Link>
  );
};