import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Globe } from 'lucide-react';
import { notifyUserFollow } from '@/lib/notifications';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  name: string | null;
}

const Followers = () => {
  const { username: rawUsername } = useParams();
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      
      if (username) {
        fetchData(session?.user ?? null);
      }
    };
    init();
  }, [username]);

  const fetchData = async (user?: any) => {
    const activeUser = user ?? currentUser;
    setLoading(true);
    try {
      // Get the user profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Check if current user follows this profile
      if (activeUser) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', activeUser.id)
          .eq('followed_id', profileData.id)
          .maybeSingle();

        setIsFollowing(!!followData);
      }

      // Get follower/following counts
      const { count: followersTotal } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', profileData.id);

      const { count: followingTotal } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      const { count: productsTotal } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profileData.id)
        .eq('status', 'launched');

      setFollowerCount(followersTotal || 0);
      setFollowingCount(followingTotal || 0);
      setProductsCount(productsTotal || 0);

      // Fetch followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id, users!follows_follower_id_fkey(id, username, avatar_url, bio, name)')
        .eq('followed_id', profileData.id);

      if (followersData) {
        setFollowers(followersData.map(f => f.users as UserItem));
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      toast.error('Please login to follow users');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('followed_id', profile.id);

        setIsFollowing(false);
        setFollowerCount(prev => prev - 1);
        toast.success('Unfollowed successfully');
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            followed_id: profile.id,
          });

        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success('Following successfully');
        
        // Send notification to the followed user
        notifyUserFollow(profile.id, currentUser.id);
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      toast.error('Failed to update follow status');
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <Link to="/" className="text-primary hover:underline">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <Card className="p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url} alt={profile.username} />
              <AvatarFallback className="text-2xl">
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">@{profile.username}</h1>
                  {profile.name && (
                    <p className="text-xl text-muted-foreground mb-2">{profile.name}</p>
                  )}
                  {profile.bio && (
                    <p className="text-muted-foreground">{profile.bio}</p>
                  )}
                </div>

                {currentUser && currentUser.id !== profile.id && (
                  <Button
                    onClick={handleFollow}
                    variant={isFollowing ? 'outline' : 'default'}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex gap-6 mb-4">
                <Link
                  to={`/@${profile.username}/followers`}
                  className="hover:underline font-bold"
                >
                  <span className="font-bold">{followerCount}</span>
                  <span className="text-muted-foreground ml-1 font-normal">Followers</span>
                </Link>
                <Link
                  to={`/@${profile.username}/following`}
                  className="hover:underline"
                >
                  <span className="font-bold">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </Link>
                <Link
                  to={`/@${profile.username}`}
                  className="hover:underline"
                >
                  <span className="font-bold">{productsCount}</span>
                  <span className="text-muted-foreground ml-1">Products</span>
                </Link>
              </div>

              <div className="flex gap-3">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Website"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
                {profile.twitter && (
                  <a
                    href={`https://x.com/${profile.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="X (Twitter)"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-6">Followers</h2>

        {followers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No followers yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {followers.map((user) => (
              <Link
                key={user.id}
                to={`/@${user.username}`}
                className="block"
              >
                <Card className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                      <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">@{user.username}</div>
                      {user.name && (
                        <div className="text-sm text-muted-foreground">{user.name}</div>
                      )}
                      {user.bio && (
                        <div className="text-sm text-muted-foreground truncate">{user.bio}</div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Followers;
