import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ProfileSkeleton } from '@/components/ProfileSkeleton';
import { ProfileMiniHero } from '@/components/ProfileMiniHero';
import { UserListItem } from '@/components/UserListItem';

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
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    if (!username) return;
    (async () => {
      setLoading(true);
      try {
        const { data: profileData } = await supabase
          .from('users').select('*').eq('username', username).single();
        if (!profileData) { setLoading(false); return; }
        setProfile(profileData);

        const [{ count: followersTotal }, { count: followingTotal }, { count: productsTotal }, { data: followersData }] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followed_id', profileData.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id),
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('owner_id', profileData.id).eq('status', 'launched'),
          supabase.from('follows').select('follower_id, users!follows_follower_id_fkey(id, username, avatar_url, bio, name)').eq('followed_id', profileData.id),
        ]);

        setFollowerCount(followersTotal || 0);
        setFollowingCount(followingTotal || 0);
        setProductsCount(productsTotal || 0);
        if (followersData) setFollowers(followersData.map((f: any) => f.users as UserItem).filter(Boolean));
      } catch (e) {
        console.error('Error fetching followers:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  if (loading) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <Link to="/" className="text-primary hover:underline">Return home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileMiniHero
        profile={profile}
        followerCount={followerCount}
        followingCount={followingCount}
        productsCount={productsCount}
        active="followers"
      />

      <div className="container mx-auto px-4 max-w-5xl pb-12">
        <div className="border-b border-border mb-2">
          <h2 className="font-reckless text-xl font-bold pb-3">Followers</h2>
        </div>

        {followers.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center text-sm">No followers yet</p>
        ) : (
          <div className="divide-y divide-border/60">
            {followers.map((user) => (
              <UserListItem key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Followers;
