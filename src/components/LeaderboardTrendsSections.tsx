import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  Rocket,
} from 'lucide-react';
import { useLeaderboardTrends, type TrendingBuilder } from '@/hooks/use-leaderboard-trends';
import { BuilderBadges, getBuilderBadges } from '@/components/BuilderBadges';

function RankDelta({ change }: { change: number | null | undefined }) {
  if (change == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        new
      </span>
    );
  }
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
        <ArrowUpRight className="h-3 w-3" />
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
        <ArrowDownRight className="h-3 w-3" />
        {Math.abs(change)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
      <Minus className="h-3 w-3" />
    </span>
  );
}

function MiniBuilderRow({ b, index, showDelta = true }: { b: TrendingBuilder; index: number; showDelta?: boolean }) {
  const badges = getBuilderBadges(b);
  return (
    <Link
      to={`/@${b.username}`}
      className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
    >
      <span className="text-xs font-semibold text-muted-foreground tabular-nums w-5 text-center flex-shrink-0">
        {index + 1}
      </span>
      <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
        <AvatarImage src={b.avatar_url || ''} alt={b.username} />
        <AvatarFallback className="rounded-md text-xs">
          {b.username?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground truncate">
            {b.name || `@${b.username}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <BuilderBadges badges={badges} max={2} />
        </div>
      </div>
      {showDelta && <RankDelta change={b.rankChange} />}
    </Link>
  );
}

function SectionCard({
  title,
  icon: Icon,
  iconClass,
  description,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Icon className={`h-4 w-4 ${iconClass}`} />
          {title}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return <p className="text-xs text-muted-foreground py-3 text-center">{msg}</p>;
}

export function LeaderboardTrendsSections({ stacked = false }: { stacked?: boolean } = {}) {
  const { builders, loading } = useLeaderboardTrends();

  const gridClass = stacked
    ? 'grid gap-4 grid-cols-1'
    : 'grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8';

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="flex items-center gap-2 py-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const trending = [...builders]
    .filter((b) => b.currentScore > 0)
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 6);

  const risers = [...builders]
    .filter((b) => (b.rankChange || 0) > 0 && b.currentRank != null)
    .sort((a, b) => (b.rankChange || 0) - (a.rankChange || 0))
    .slice(0, 5);

  const fallers = [...builders]
    .filter((b) => (b.rankChange || 0) < 0 && b.currentRank != null)
    .sort((a, b) => (a.rankChange || 0) - (b.rankChange || 0))
    .slice(0, 5);

  const newEntrants = [...builders]
    .filter((b) => b.isNewEntrant)
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 5);

  return (
    <div className={gridClass}>
      <SectionCard
        title="Trending Vibe Coders"
        icon={Flame}
        iconClass="text-orange-500"
        description="Last 7 days of momentum"
      >
        {trending.length === 0 ? (
          <EmptyRow msg="No movement yet this week." />
        ) : (
          trending.map((b, i) => <MiniBuilderRow key={b.user_id} b={b} index={i} showDelta={false} />)
        )}
      </SectionCard>

      <SectionCard
        title="Biggest Risers"
        icon={TrendingUp}
        iconClass="text-emerald-500"
        description="Climbing the leaderboard"
      >
        {risers.length === 0 ? (
          <EmptyRow msg="No risers yet." />
        ) : (
          risers.map((b, i) => (
            <Link
              key={b.user_id}
              to={`/@${b.username}`}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
                <AvatarImage src={b.avatar_url || ''} alt={b.username} />
                <AvatarFallback className="rounded-md text-xs">
                  {b.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.name || `@${b.username}`}</p>
                <p className="text-[11px] text-muted-foreground">
                  #{b.previousRank} → <span className="text-foreground font-semibold">#{b.currentRank}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                <ArrowUpRight className="h-3 w-3" />
                {b.rankChange}
              </span>
            </Link>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Biggest Fallers"
        icon={TrendingDown}
        iconClass="text-red-500"
        description="Losing ground this week"
      >
        {fallers.length === 0 ? (
          <EmptyRow msg="No fallers." />
        ) : (
          fallers.map((b) => (
            <Link
              key={b.user_id}
              to={`/@${b.username}`}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
                <AvatarImage src={b.avatar_url || ''} alt={b.username} />
                <AvatarFallback className="rounded-md text-xs">
                  {b.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.name || `@${b.username}`}</p>
                <p className="text-[11px] text-muted-foreground">
                  #{b.previousRank} → <span className="text-foreground font-semibold">#{b.currentRank}</span>
                </p>
              </div>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                <ArrowDownRight className="h-3 w-3" />
                {Math.abs(b.rankChange || 0)}
              </span>
            </Link>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="New This Week"
        icon={Sparkles}
        iconClass="text-blue-500"
        description="Builders just on the board"
      >
        {newEntrants.length === 0 ? (
          <EmptyRow msg="No new entrants yet." />
        ) : (
          newEntrants.map((b) => (
            <Link
              key={b.user_id}
              to={`/@${b.username}`}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-8 w-8 rounded-md flex-shrink-0">
                <AvatarImage src={b.avatar_url || ''} alt={b.username} />
                <AvatarFallback className="rounded-md text-xs">
                  {b.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.name || `@${b.username}`}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex items-center gap-0.5">
                    <Rocket className="h-2.5 w-2.5" />
                    {b.weeklyLaunches || b.totalLaunches}
                  </span>
                  {b.currentRank && <span>#{b.currentRank}</span>}
                </p>
              </div>
            </Link>
          ))
        )}
      </SectionCard>
    </div>
  );
}

export { RankDelta };
