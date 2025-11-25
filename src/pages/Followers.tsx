import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

const Followers = () => {
  const { username: rawUsername } = useParams();
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      fetchData();
    }
  }, [username]);

  const fetchData = async () => {
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

      // Fetch followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id, users!follows_follower_id_fkey(id, username, avatar_url, bio)')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
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
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Link to={`/@${profile.username}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to profile
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">@{profile.username}'s Followers</h1>
          <p className="text-muted-foreground mt-1">{followers.length} followers</p>
        </div>

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
  );
};

export default Followers;
