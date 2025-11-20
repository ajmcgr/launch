import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Globe, Twitter } from 'lucide-react';
import { LaunchCard } from '@/components/LaunchCard';

const UserProfile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch user's products
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          product_media!inner(url, type),
          product_category_map(
            product_categories(name)
          )
        `)
        .eq('owner_id', profileData.id)
        .eq('status', 'launched')
        .eq('product_media.type', 'thumbnail')
        .order('launch_date', { ascending: false });

      if (productsData) {
        // Get vote counts
        const productIds = productsData.map(p => p.id);
        const { data: votesData } = await supabase
          .from('votes')
          .select('product_id, value');

        const voteCounts: Record<string, number> = {};
        votesData?.forEach(vote => {
          voteCounts[vote.product_id] = (voteCounts[vote.product_id] || 0) + vote.value;
        });

        const formattedProducts = productsData.map(product => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          thumbnail: product.product_media?.[0]?.url || '',
          categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
          netVotes: voteCounts[product.id] || 0,
          makers: [{ username: profileData.username, avatar_url: profileData.avatar_url }],
        }));

        setProducts(formattedProducts);
      }

      // Check if current user follows this profile
      if (currentUser) {
        const { data: followData } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('followed_id', profileData.id)
          .single();

        setIsFollowing(!!followData);
      }

      // Get follower/following counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_id', profileData.id);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
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
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      toast.error('Failed to update follow status');
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
                <div>
                  <span className="font-bold">{followerCount}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
                <div>
                  <span className="font-bold">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-bold">{products.length}</span>
                  <span className="text-muted-foreground ml-1">Products</span>
                </div>
              </div>

              <div className="flex gap-4">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {profile.twitter && (
                  <a
                    href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-6">Launched Products</h2>
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products launched yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <LaunchCard
                  key={product.id}
                  {...product}
                  onVote={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
