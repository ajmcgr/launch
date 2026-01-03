import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Globe } from 'lucide-react';
import { notifyUserFollow } from '@/lib/notifications';
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
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user ?? null);
      
      if (username) {
        fetchProfile(session?.user ?? null);
      }
    };
    init();
  }, [username]);

  const fetchProfile = async (user?: any) => {
    const activeUser = user ?? currentUser;
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
      if (activeUser && activeUser.id === profileData.id) {
        const allProductIds = [...products.map(p => p.id), ...upvotedProducts.map(p => p.id)];
        if (allProductIds.length > 0) {
          const { data: userFollowsData } = await supabase
            .from('product_follows')
            .select('product_id')
            .eq('follower_id', activeUser.id)
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
        
        // Send notification to the followed user
        notifyUserFollow(profile.id, currentUser.id);
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

              <div className="flex gap-3 flex-wrap">
                {profile.website && (
                  <a
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
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
                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Instagram"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={`https://linkedin.com/in/${profile.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="LinkedIn"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
                {profile.youtube && (
                  <a
                    href={`https://youtube.com/@${profile.youtube.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="YouTube"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </a>
                )}
                {profile.telegram && (
                  <a
                    href={`https://t.me/${profile.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title="Telegram"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
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
