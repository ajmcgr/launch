import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultTab?: 'followers' | 'following';
}

interface UserItem {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export const FollowersDialog = ({ open, onOpenChange, userId, defaultTab = 'followers' }: FollowersDialogProps) => {
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchFollowData();
    }
  }, [open, userId]);

  const fetchFollowData = async () => {
    setLoading(true);
    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id, users!follows_follower_id_fkey(id, username, avatar_url, bio)')
        .eq('followed_id', userId);

      if (followersData) {
        setFollowers(followersData.map(f => f.users as UserItem));
      }

      // Fetch following
      const { data: followingData } = await supabase
        .from('follows')
        .select('followed_id, users!follows_followed_id_fkey(id, username, avatar_url, bio)')
        .eq('follower_id', userId);

      if (followingData) {
        setFollowing(followingData.map(f => f.users as UserItem));
      }
    } catch (error) {
      console.error('Error fetching follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const UserList = ({ users }: { users: UserItem[] }) => (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {users.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No users yet
        </div>
      ) : (
        users.map((user) => (
          <Link
            key={user.id}
            to={`/@${user.username}`}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
            onClick={() => onOpenChange(false)}
          >
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
          </Link>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="followers" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <UserList users={followers} />
            )}
          </TabsContent>
          <TabsContent value="following" className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <UserList users={following} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
