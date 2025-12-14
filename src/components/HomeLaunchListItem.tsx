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
        className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer"
      >
      <div className="flex items-center gap-4 flex-1">
        <span className="text-2xl font-bold text-muted-foreground w-8">
          {rank}
        </span>
        <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-reckless font-semibold text-lg text-foreground">
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
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{tagline}</p>
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
          className={`group flex flex-col items-center gap-0 h-auto py-1 px-3 min-w-[50px] hover:border-primary hover:bg-primary transition-all hover:scale-105 ${userVote === 1 ? 'border-primary' : ''}`}
        >
          <span className="text-xs group-hover:text-primary-foreground">▲</span>
          <span className="font-semibold text-sm group-hover:text-primary-foreground">{votes}</span>
        </Button>
      </div>
      </div>
    </Link>
  );
};