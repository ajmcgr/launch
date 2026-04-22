import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Rocket, MousePointerClick, Eye, FileText, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlatformStats {
  launched: number;
  makers: number;
  clicksSent: number;
  visitorsYTD: number | null;
  pageviewsYTD: number | null;
  sessionsYTD: number | null;
  liveVisitors: number | null;
}

function formatStat(n: number): string {
  if (n < 1000) {
    if (n < 100) return `${n}`;
    return `${Math.floor(n / 100) * 100}+`;
  }
  if (n < 1_000_000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K+`;
  }
  const m = n / 1_000_000;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M+`;
}

export const SiteStatsWidget = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-stats-full'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-platform-stats');
      if (error) throw error;
      return data as PlatformStats;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });

  const hasGAData = data && data.visitorsYTD !== null && data.visitorsYTD > 0;

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
        Launch Stats
      </h3>

      {isLoading || !data ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {hasGAData && (
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-3.5 w-3.5" />
                Visitors
              </span>
              <span className="font-semibold text-foreground">{formatStat(data.visitorsYTD!)}</span>
            </li>
          )}
          {data.pageviewsYTD !== null && data.pageviewsYTD > 0 && (
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Pageviews
              </span>
              <span className="font-semibold text-foreground">{formatStat(data.pageviewsYTD)}</span>
            </li>
          )}
          {data.sessionsYTD !== null && data.sessionsYTD > 0 && (
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Sessions
              </span>
              <span className="font-semibold text-foreground">{formatStat(data.sessionsYTD)}</span>
            </li>
          )}
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" />
              Products launched
            </span>
            <span className="font-semibold text-foreground">{formatStat(data.launched)}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Makers
            </span>
            <span className="font-semibold text-foreground">{formatStat(data.makers)}</span>
          </li>
          {data.clicksSent > 0 && (
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MousePointerClick className="h-3.5 w-3.5" />
                Clicks sent
              </span>
              <span className="font-semibold text-foreground">{formatStat(data.clicksSent)}</span>
            </li>
          )}
        </ul>
      )}
      {!isLoading && hasGAData && (
        <p className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          Visitor data via Google Analytics
        </p>
      )}
    </div>
  );
};
