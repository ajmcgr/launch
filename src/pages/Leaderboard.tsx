import { useState } from 'react';
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
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
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

const Leaderboard = () => {
  const [sortMode, setSortMode] = useState<SortMode>('alltime');
  const [weekFilter, setWeekFilter] = useState<string | undefined>(undefined);
  const { users, loading, availableWeeks } = useMakerScores(sortMode, weekFilter);

  // Filter out zero-score users for weekly view
  const filteredUsers = ['today', 'weekly', 'monthly', 'yearly'].includes(sortMode)
    ? users.filter((u) => u.weeklyScore > 0)
    : users;

  return (
    <div className="min-h-screen bg-background py-6">
      <Helmet>
        <title>Makers | Launch</title>
        <meta name="description" content="Top makers on Launch ranked by weekly distribution score. Earn points through launches, reviews, shares, and boosts." />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-6 font-reckless">Makers</h1>

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
            filteredUsers.map((user, index) => {
              const rank = index + 1;
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
                      {rank <= 3 && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          rank === 1 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                          rank === 2 ? 'bg-gray-400/10 text-gray-500 dark:text-gray-400' :
                          'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {rank === 1 ? 'Gold' : rank === 2 ? 'Silver' : 'Bronze'}
                        </span>
                      )}
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
