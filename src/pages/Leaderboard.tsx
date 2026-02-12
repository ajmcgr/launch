import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useKarmaLeaderboard } from '@/hooks/use-karma';

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground">{rank}.</span>;
};

const getChangeIndicator = (change: number | null | undefined) => {
  if (change === null || change === undefined) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-500">
        <TrendingUp className="h-3 w-3" />
        +{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <TrendingDown className="h-3 w-3" />
        {change}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />
      0
    </span>
  );
};

const Leaderboard = () => {
  const { users, loading } = useKarmaLeaderboard(100);

  return (
    <div className="min-h-screen bg-background py-6">
      <Helmet>
        <title>Top Makers | Launch</title>
        <meta name="description" content="Top makers on Launch ranked by karma. Earn karma through upvotes, comments, and wins." />
      </Helmet>
      
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-2xl font-bold text-center mb-2">Top Makers</h2>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Top makers ranked by karma. Earn points from upvotes, comments, and wins.
        </p>

        {/* Table header */}
        <div className="flex items-center gap-3 py-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="w-5 flex-shrink-0">#</div>
          <div className="w-10 flex-shrink-0"></div>
          <div className="flex-1">Maker</div>
          <div className="w-16 text-right flex-shrink-0">Growth</div>
          <div className="w-16 text-right flex-shrink-0">Karma</div>
        </div>

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
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No karma data yet. Start launching products!
            </div>
          ) : (
            users.map((user, index) => (
              <Link
                key={user.user_id}
                to={`/@${user.username}`}
                className="flex items-center gap-3 py-3 px-2 hover:bg-muted/30 transition-colors"
              >
                <div className="w-5 flex justify-center flex-shrink-0">
                  {getRankIcon(index + 1)}
                </div>
                <Avatar className="h-10 w-10 rounded-lg flex-shrink-0">
                  <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                  <AvatarFallback className="rounded-lg">{user.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {user.name || `@${user.username}`}
                    </h3>
                  </div>
                  {user.name && (
                    <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
                <div className="w-16 flex justify-end flex-shrink-0">
                  {getChangeIndicator(user.karmaChange)}
                </div>
                <div className="w-16 flex items-center justify-end font-bold text-sm text-foreground flex-shrink-0">
                  {user.karma.toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </div>
        
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
          <p className="font-medium">How karma is calculated:</p>
          <p>+1 per upvote received · +1 per comment written · +1 per comment received</p>
          <p>+10 daily win · +25 weekly win · +50 monthly win</p>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
