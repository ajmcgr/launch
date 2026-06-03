import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal, Award, Zap } from 'lucide-react';
import { useMakerScores } from '@/hooks/use-maker-scores';
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

const getRankBadge = (rank: number) => {
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
};

const getScoreLabel = (sortMode: SortMode, user: any) => {
  switch (sortMode) {
    case 'today':
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return user.weeklyScore;
    case 'alltime':
      return user.totalLaunches;
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
      return 'launches';
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

  // Filter out zero-score users for weekly view
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
        <meta name="description" content="Top vibe coders on Launch ranked by weekly distribution score. Earn points through launches, reviews, shares, and boosts." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-6 font-reckless">Top Vibe Coders</h1>

        {/* Sort Tabs */}
        <div className="flex items-center justify-center mb-6">
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

          {/* Week selector for weekly mode */}
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

        {/* Leaderboard List */}
        <div>
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-2">
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

              return (
                <Link
                  key={user.user_id}
                  to={`/@${user.username}`}
                  className="flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                    <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                    <AvatarFallback className="rounded-lg">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 flex justify-center flex-shrink-0">
                        {getRankBadge(rank)}
                      </div>
                      <h3 className="font-semibold text-base text-foreground truncate">
                        {user.name || `@${user.username}`}
                      </h3>
                    </div>
                    {user.name && (
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    )}
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

        {/* Points breakdown */}
        {sortMode === 'weekly' && (
          <div className="mt-8 text-center text-xs text-muted-foreground space-y-1 border-t pt-6">
            <p className="font-medium text-foreground/70">How points are earned</p>
            <p>+10 launch · +5 review received · +15 referral signup · +3 share click · +20 boost purchase</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
