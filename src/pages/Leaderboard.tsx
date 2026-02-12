import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Trophy, Medal, Award } from 'lucide-react';
import { useKarmaLeaderboard } from '@/hooks/use-karma';

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
};

const Leaderboard = () => {
  const { users, loading } = useKarmaLeaderboard(100);

  return (
    <div className="min-h-screen bg-background py-8">
      <Helmet>
        <title>Karma Leaderboard | Launch</title>
        <meta name="description" content="Top makers on Launch ranked by karma. Earn karma through upvotes, comments, and wins." />
      </Helmet>
      
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Karma Leaderboard</h1>
          <p className="text-muted-foreground text-sm">
            Top makers ranked by karma. Earn points from upvotes, comments, and wins.
          </p>
        </div>

        <Card className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No karma data yet. Start launching products!
            </div>
          ) : (
            users.map((user, index) => (
              <Link
                key={user.user_id}
                to={`/@${user.username}`}
                className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-6 flex justify-center flex-shrink-0">
                  {getRankIcon(index + 1)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || ''} alt={user.username} />
                  <AvatarFallback>{user.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {user.name || `@${user.username}`}
                  </p>
                  {user.name && (
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary font-semibold text-sm flex-shrink-0">
                  <Zap className="h-4 w-4" />
                  {user.karma.toLocaleString()}
                </div>
              </Link>
            ))
          )}
        </Card>
        
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
