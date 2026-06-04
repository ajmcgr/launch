import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Info, Users, Rocket, Star } from 'lucide-react';
import { useMakerScores } from '@/hooks/use-maker-scores';
import { useLeaderboardTrends } from '@/hooks/use-leaderboard-trends';
import { LeaderboardTrendsSections, RankDelta } from '@/components/LeaderboardTrendsSections';
import { BuilderBadges, getBuilderBadges } from '@/components/BuilderBadges';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortMode = 'today' | 'weekly' | 'monthly' | 'yearly' | 'alltime';

const TAB_CONFIG: { key: SortMode; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'weekly', label: 'Week' },
  { key: 'monthly', label: 'Month' },
  { key: 'yearly', label: 'Year' },
  { key: 'alltime', label: 'All' },
];

const getScoreLabel = (sortMode: SortMode, user: any) => {
  switch (sortMode) {
    case 'today':
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return user.weeklyScore;
    case 'alltime':
      return user.karma;
  }
};

const getScoreUnit = (sortMode: SortMode) => {
  switch (sortMode) {
    case 'today':
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return 'pts';
    case 'alltime':
      return 'karma';
  }
};

const formatWeekLabel = (weekStart: string) => {
  const date = new Date(weekStart + 'T00:00:00Z');
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${date.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
};

const PAGE_SIZE = 50;

const Leaderboard = () => {
  const [sortMode, setSortMode] = useState<SortMode>('alltime');
  const [weekFilter, setWeekFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { users, loading, availableWeeks } = useMakerScores(sortMode, weekFilter);
  const { builders: trendBuilders } = useLeaderboardTrends();

  // Build maps from trend data for fast lookup
  const trendsByUserId = useMemo(() => {
    const m = new Map<string, (typeof trendBuilders)[number]>();
    trendBuilders.forEach((b) => m.set(b.user_id, b));
    return m;
  }, [trendBuilders]);

  // Filter out zero-score users for non-alltime views
  const filteredUsers = ['today', 'weekly', 'monthly', 'yearly'].includes(sortMode)
    ? users.filter((u) => u.weeklyScore > 0)
    : users;

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [sortMode, weekFilter]);

  return (
    <div className="min-h-screen bg-background py-6">
      <Helmet>
        <title>Top Vibe Coders | Launch</title>
        <meta
          name="description"
          content="Live leaderboard of the top vibe coders on Launch. Track trending builders, biggest risers, new entrants, and weekly rank movement."
        />
      </Helmet>

      <div className="container mx-auto px-4 max-w-7xl">
        <header className="text-center mb-2">
          <h1 className="text-4xl font-bold font-reckless">Top Vibe Coders</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Where vibe coders get discovered. Rankings refresh weekly — climb to earn badges and visibility.
          </p>
        </header>

        {/* Sort Tabs */}
        <div className="flex items-center justify-center gap-3 mt-6 mb-6 flex-wrap">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSortMode(tab.key);
                  if (tab.key !== 'weekly') setWeekFilter(undefined);
                }}
                className={`
                  inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all
                  ${sortMode === tab.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {sortMode === 'weekly' && availableWeeks.length > 1 && (
            <Select
              value={weekFilter || availableWeeks[0]}
              onValueChange={(v) => setWeekFilter(v)}
            >
              <SelectTrigger className="w-auto min-w-[180px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableWeeks.map((w) => (
                  <SelectItem key={w} value={w} className="text-xs">
                    {formatWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Two-column layout: main board + stacked trends */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {/* Main leaderboard */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 px-4">
                    <Skeleton className="h-4 w-5" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <p className="text-sm">
                    {sortMode === 'weekly'
                      ? 'No scores yet this week. Launch a product to get on the board!'
                      : 'No maker data yet.'}
                  </p>
                </div>
              ) : (
                pagedUsers.map((user, index) => {
                  const rank = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const score = getScoreLabel(sortMode, user);
                  const trend = trendsByUserId.get(user.user_id);
                  const badges = trend ? getBuilderBadges(trend) : [];
                  const showDelta = sortMode === 'weekly' || sortMode === 'today';

                  return (
                    <Link
                      key={user.user_id}
                      to={`/@${user.username}`}
                      className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors border-b last:border-b-0"
                    >
                      <span className="text-sm font-bold text-muted-foreground tabular-nums w-8 text-right flex-shrink-0">
                        {rank}
                      </span>
                      {showDelta && (
                        <span className="w-10 flex-shrink-0 flex justify-start">
                          <RankDelta change={trend?.rankChange ?? null} />
                        </span>
                      )}
                      <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                        <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                        <AvatarFallback className="rounded-lg">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-base text-foreground truncate">
                            {user.name || `@${user.username}`}
                          </h3>
                          <BuilderBadges badges={badges} max={3} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {user.name && <span>@{user.username}</span>}
                          <span className="inline-flex items-center gap-0.5">
                            <Rocket className="h-3 w-3" />
                            {user.totalLaunches} launches
                          </span>
                          {trend && trend.followers > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Users className="h-3 w-3" />
                              {trend.followers.toLocaleString()} followers
                            </span>
                          )}
                          {user.totalReviews > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Star className="h-3 w-3" />
                              {user.totalReviews} reviews
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-sm text-foreground flex-shrink-0 tabular-nums">
                        <Zap className="h-3.5 w-3.5" />
                        {score.toLocaleString()}
                        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                          {getScoreUnit(sortMode)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {!loading && filteredUsers.length > PAGE_SIZE && (
              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column: stacked trend cards */}
          <aside className="space-y-4">
            <LeaderboardTrendsSections stacked />
          </aside>
        </div>

        {/* How rankings work */}
        <div className="mt-10 rounded-xl border bg-muted/30 p-5">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 mb-2">
            <Info className="h-4 w-4" />
            How rankings work
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Vibe Coder leaderboard refreshes every week. Rankings are calculated using a weighted blend of
            product launches, votes received, followers gained, profile engagement, and community activity
            (reviews, comments, referrals, boosts). Exact weights stay private to keep the leaderboard fair —
            but consistency wins. Launch quality products, support other builders, and your rank will climb.
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            <span className="font-medium text-foreground/70">Earn badges:</span>{' '}
            🏆 Top 10 · 💯 Top 100 · 🚀 Top Launcher · ⚡ Rising Builder · 🔥 Trending · 🆕 New Entrant
          </p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
