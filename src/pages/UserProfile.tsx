import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Globe } from 'lucide-react';
import { LaunchCard } from '@/components/LaunchCard';

const UserProfile = () => {
  const { username: rawUsername } = useParams();
  const username = rawUsername?.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [upvotedProducts, setUpvotedProducts] = useState<any[]>([]);
  const [followedUsers, setFollowedUsers] = useState<any[]>([]);
  const [followedProducts, setFollowedProducts] = useState<any[]>([]);
  const [followedProductIds, setFollowedProductIds] = useState<Set<string>>(new Set());
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

      console.log('Profile query result:', { profileData, profileError });

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }
      
      if (!profileData) {
        setLoading(false);
        return;
      }
      
      setProfile(profileData);
      console.log('Profile set successfully:', profileData);

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
          thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
          iconUrl: product.product_media?.find((m: any) => m.type === 'icon')?.url || '',
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

      // Fetch recently upvoted products
      const { data: userVotes } = await supabase
        .from('votes')
        .select('product_id, created_at')
        .eq('user_id', profileData.id)
        .eq('value', 1)
        .order('created_at', { ascending: false })
        .limit(6);

      if (userVotes && userVotes.length > 0) {
        const votedProductIds = userVotes.map(v => v.product_id);
        
        const { data: votedProductsData } = await supabase
          .from('products')
          .select(`
            *,
            product_media!inner(url, type),
            product_category_map(
              product_categories(name)
            ),
            product_makers(
              users(username, avatar_url)
            )
          `)
          .in('id', votedProductIds)
          .eq('status', 'launched')
          .eq('product_media.type', 'thumbnail');

        if (votedProductsData) {
          // Get vote counts for upvoted products
          const { data: votesData } = await supabase
            .from('votes')
            .select('product_id, value')
            .in('product_id', votedProductIds);

          const voteCounts: Record<string, number> = {};
          votesData?.forEach(vote => {
            voteCounts[vote.product_id] = (voteCounts[vote.product_id] || 0) + vote.value;
          });

          const formattedUpvotedProducts = votedProductsData.map(product => ({
            id: product.id,
            slug: product.slug,
            name: product.name,
            tagline: product.tagline,
            thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
            iconUrl: product.product_media?.find((m: any) => m.type === 'icon')?.url || '',
            categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
            netVotes: voteCounts[product.id] || 0,
            makers: product.product_makers?.map((m: any) => m.users) || [],
          }));

          setUpvotedProducts(formattedUpvotedProducts);
        }
      }

      // Fetch followed users
      const { data: followedUsersData } = await supabase
        .from('follows')
        .select('followed_id, users!follows_followed_id_fkey(username, avatar_url, bio)')
        .eq('follower_id', profileData.id);

      if (followedUsersData) {
        setFollowedUsers(followedUsersData.map(f => f.users));
      }

      // Fetch followed products
      const { data: followedProductsData } = await supabase
        .from('product_follows')
        .select(`
          product_id,
          products(
            id,
            slug,
            name,
            tagline,
            product_media(url, type),
            product_category_map(product_categories(name))
          )
        `)
        .eq('follower_id', profileData.id);

      if (followedProductsData) {
        const productIds = followedProductsData.map(f => f.products.id);
        setFollowedProductIds(new Set(productIds));
        
        // Get vote counts
        const { data: votesData } = await supabase
          .from('votes')
          .select('product_id, value')
          .in('product_id', productIds);

        const voteCounts: Record<string, number> = {};
        votesData?.forEach(vote => {
          voteCounts[vote.product_id] = (voteCounts[vote.product_id] || 0) + vote.value;
        });

        const formattedFollowedProducts = followedProductsData.map(f => ({
          id: f.products.id,
          slug: f.products.slug,
          name: f.products.name,
          tagline: f.products.tagline,
          thumbnail: f.products.product_media?.find((m: any) => m.type === 'thumbnail')?.url || '',
          iconUrl: f.products.product_media?.find((m: any) => m.type === 'icon')?.url || '',
          categories: f.products.product_category_map?.map((c: any) => c.product_categories.name) || [],
          netVotes: voteCounts[f.products.id] || 0,
          makers: [],
        }));

        setFollowedProducts(formattedFollowedProducts);
      }

      // If current user is viewing, also get their follow status for all products on this page
      if (currentUser && currentUser.id === profileData.id) {
        const allProductIds = [...products.map(p => p.id), ...upvotedProducts.map(p => p.id)];
        if (allProductIds.length > 0) {
          const { data: userFollowsData } = await supabase
            .from('product_follows')
            .select('product_id')
            .eq('follower_id', currentUser.id)
            .in('product_id', allProductIds);
          
          if (userFollowsData) {
            setFollowedProductIds(new Set(userFollowsData.map(f => f.product_id)));
          }
        }
      }

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProductFollow = async (productId: string) => {
    if (!currentUser) {
      toast.error('Please login to follow products');
      return;
    }

    try {
      const isCurrentlyFollowing = followedProductIds.has(productId);
      
      if (isCurrentlyFollowing) {
        await supabase
          .from('product_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('product_id', productId);

        setFollowedProductIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast.success('Unfollowed product');
      } else {
        await supabase
          .from('product_follows')
          .insert({
            follower_id: currentUser.id,
            product_id: productId,
          });

        setFollowedProductIds(prev => new Set(prev).add(productId));
        toast.success('Following product');
      }
    } catch (error: any) {
      console.error('Error following/unfollowing product:', error);
      toast.error('Failed to update follow status');
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
                  className="hover:underline"
                >
                  <span className="font-bold">{followerCount}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </Link>
                <Link
                  to={`/@${profile.username}/following`}
                  className="hover:underline"
                >
                  <span className="font-bold">{followingCount}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </Link>
                <div>
                  <span className="font-bold">{products.length}</span>
                  <span className="text-muted-foreground ml-1">Products</span>
                </div>
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
                  showFollowButton={currentUser && currentUser.id !== profile.id}
                  isFollowing={followedProductIds.has(product.id)}
                  onFollow={handleProductFollow}
                />
              ))}
            </div>
          )}
        </div>

        {upvotedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Recently Upvoted</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upvotedProducts.map((product) => (
                <LaunchCard
                  key={product.id}
                  {...product}
                  onVote={() => {}}
                  showFollowButton={currentUser && currentUser.id !== profile.id}
                  isFollowing={followedProductIds.has(product.id)}
                  onFollow={handleProductFollow}
                />
              ))}
            </div>
          </div>
        )}

        {followedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Following Products</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {followedProducts.map((product) => (
                <LaunchCard
                  key={product.id}
                  {...product}
                  onVote={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {followedUsers.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Following People</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {followedUsers.map((user) => (
                <Link
                  key={user.username}
                  to={`/@${user.username}`}
                  className="flex flex-col items-center p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage src={user.avatar_url} alt={user.username} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-semibold">@{user.username}</p>
                    {user.bio && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
