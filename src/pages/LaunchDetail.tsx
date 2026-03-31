import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ArrowUp, ExternalLink, Calendar, Star, MessageSquare, BarChart3, DollarSign, Link2, Copy, Check, Trophy, Medal, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { CommentForm } from '@/components/CommentForm';
import { CommentList } from '@/components/CommentList';
import { StarRating } from '@/components/StarRating';
import { LanguageDisplay } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AdvertiseCTA from '@/components/AdvertiseCTA';
import SidebarSponsoredAd from '@/components/SidebarSponsoredAd';
import InlineAdSlot from '@/components/InlineAdSlot';
import LaunchWindowStatus from '@/components/LaunchWindowStatus';
import BoostNudgeCard from '@/components/BoostNudgeCard';
import { isActiveLaunch } from '@/lib/launchWindow';


const LaunchDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [stackItems, setStackItems] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [bestRanking, setBestRanking] = useState<{ rank: number; period: string; date: string } | null>(null);
  const [currentRank, setCurrentRank] = useState<number | undefined>(undefined);

  useEffect(() => {
    // Check for success parameter from Stripe redirect
    if (searchParams.get('success') === 'true') {
      toast.success('🎉 Payment successful! Your product has been submitted and will be launched soon.');
      // Remove the success parameter from URL
      window.history.replaceState({}, '', `/launch/${slug}`);
    }
  }, [searchParams, slug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track page view
  useEffect(() => {
    const trackPageView = async (productId: string) => {
      try {
        await supabase.from('product_analytics').insert({
          product_id: productId,
          event_type: 'page_view',
          visitor_id: localStorage.getItem('visitor_id') || crypto.randomUUID(),
        });
        // Store visitor ID for consistency
        if (!localStorage.getItem('visitor_id')) {
          localStorage.setItem('visitor_id', crypto.randomUUID());
        }
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    if (product?.id) {
      trackPageView(product.id);
    }
  }, [product?.id]);

  // Fetch product data (independent of user)
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        
        // Fetch product with media and makers
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            product_media(url, type),
            product_category_map(category_id),
            product_makers(user_id, users(username, avatar_url, bio))
          `)
          .eq('slug', slug)
          .single();

        if (productError) {
          console.error('Error fetching product:', productError);
          navigate('/404');
          return;
        }

        if (!productData) {
          navigate('/404');
          return;
        }

        // Extract makers from the nested query result
        const makers = productData.product_makers?.map((m: any) => m.users).filter((maker: any) => maker && maker.username) || [];

        // Fetch categories
        const categoryIds = productData.product_category_map?.map((m: any) => m.category_id) || [];
        if (categoryIds.length > 0) {
          const { data: categoriesData } = await supabase
            .from('product_categories')
            .select('name')
            .in('id', categoryIds);
          
          setCategories(categoriesData?.map((c: any) => c.name) || []);
        }

        // Fetch tags for this product
        const { data: tagMapData } = await supabase
          .from('product_tag_map')
          .select('tag_id')
          .eq('product_id', productData.id);

        if (tagMapData && tagMapData.length > 0) {
          const tagIds = tagMapData.map(t => t.tag_id);
          const { data: tagsData } = await supabase
            .from('product_tags')
            .select('id, name, slug')
            .in('id', tagIds);
          
          setTags(tagsData || []);
        }

        // Fetch stack items for this product
        const { data: stackMapData } = await supabase
          .from('product_stack_map')
          .select('stack_item_id')
          .eq('product_id', productData.id);

        if (stackMapData && stackMapData.length > 0) {
          const stackIds = stackMapData.map(s => s.stack_item_id);
          const { data: stackData } = await supabase
            .from('stack_items')
            .select('id, name, slug')
            .in('id', stackIds);
          
          setStackItems(stackData || []);
        }

        // Fetch vote counts
        const { data: voteData } = await supabase
          .from('product_vote_counts')
          .select('net_votes')
          .eq('product_id', productData.id)
          .maybeSingle();

        // Get follower count for this product
        const { count: followersCount } = await supabase
          .from('product_follows')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', productData.id);

        setFollowerCount(followersCount || 0);

        // Use stored winner flags as permanent awards (set by detect-winners cron)
        if (productData.won_monthly) {
          setBestRanking({ rank: 1, period: '#1 Product of the Week', date: productData.launch_date?.substring(0, 10) || '' });
        } else if (productData.won_weekly) {
          setBestRanking({ rank: 2, period: '#2 Product of the Week', date: productData.launch_date?.substring(0, 10) || '' });
        } else if (productData.won_daily) {
          setBestRanking({ rank: 3, period: '#3 Product of the Week', date: productData.launch_date?.substring(0, 10) || '' });
        }

        const productObj = {
          ...productData,
          netVotes: voteData?.net_votes || 0,
          makers
        };
        setProduct(productObj);

        // Fetch current daily rank for launched products
        if (productData.status === 'launched' && productData.launch_date) {
          try {
            const launchDay = productData.launch_date.substring(0, 10);
            const { data: rankData } = await supabase
              .from('product_vote_counts')
              .select('product_id, net_votes')
              .order('net_votes', { ascending: false });
            
            if (rankData) {
              // Get all products launched on the same day
              const { data: sameDayProducts } = await supabase
                .from('products')
                .select('id')
                .eq('status', 'launched')
                .gte('launch_date', `${launchDay}T00:00:00`)
                .lt('launch_date', `${launchDay}T23:59:59`);
              
              const sameDayIds = new Set(sameDayProducts?.map(p => p.id) || []);
              const sameDayRanked = rankData.filter(r => sameDayIds.has(r.product_id));
              const rankIndex = sameDayRanked.findIndex(r => r.product_id === productData.id);
              if (rankIndex !== -1) {
                setCurrentRank(rankIndex + 1);
              }
            }
          } catch (e) {
            console.error('Error fetching rank:', e);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, navigate]);

  // Fetch user-specific data (votes, follows) when user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !product?.id) return;
      
      try {
        const { data: userVoteData } = await supabase
          .from('votes')
          .select('value')
          .eq('product_id', product.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setUserVote((userVoteData?.value as 1 | -1) || null);

        const { data: followData } = await supabase
          .from('product_follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('product_id', product.id)
          .maybeSingle();
        
        setIsFollowing(!!followData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, product?.id]);

  const handleVote = async (value: 1 | -1) => {
    if (!user) {
      toast.error('Please login to vote');
      navigate('/auth');
      return;
    }

    try {
      const newVote: 1 | -1 | null = userVote === value ? null : value;
      
      if (newVote === null) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('product_id', product.id)
          .eq('user_id', user.id);
      } else if (userVote === null) {
        // Insert new vote
        await supabase
          .from('votes')
          .insert({
            product_id: product.id,
            user_id: user.id,
            value: newVote
          });
      } else {
        // Update existing vote
        await supabase
          .from('votes')
          .update({ value: newVote })
          .eq('product_id', product.id)
          .eq('user_id', user.id);
      }

      // Update local state
      const voteDiff = (newVote || 0) - (userVote || 0);
      setUserVote(newVote);
      setProduct({ ...product, netVotes: product.netVotes + voteDiff });

      // Notification is handled by database trigger
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleCommentAdded = () => {
    setCommentRefreshTrigger(prev => prev + 1);
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please login to follow products');
      navigate('/auth');
      return;
    }

    try {
      if (isFollowing) {
        await supabase
          .from('product_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('product_id', product.id);

        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success('Unfollowed product');
      } else {
        await supabase
          .from('product_follows')
          .insert({
            follower_id: user.id,
            product_id: product.id,
          });

        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success('Following product');
        // Notification is handled by database trigger
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      toast.error('Failed to update follow status');
    }
  };


  if (loading || !product) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-10">
              <div>
                <Skeleton className="h-10 w-3/4 mb-3" />
                <Skeleton className="h-6 w-full" />
              </div>
              <Skeleton className="w-full aspect-video rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const thumbnail = product.product_media?.find((m: any) => m.type === 'thumbnail')?.url;
  const screenshots = product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [];
  const videoUrl = product.product_media?.find((m: any) => m.type === 'video')?.url;
  
  // Use first screenshot as social sharing image, fallback to thumbnail, then default
  const socialImage = screenshots[0] || thumbnail || 'https://trylaunch.ai/social-card.png';
  
  // Extract YouTube video ID if it's a YouTube URL
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };
  
  const embedUrl = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": product.name,
    "description": product.tagline || product.description?.substring(0, 160),
    "url": `https://trylaunch.ai/launch/${product.slug}`,
    "applicationCategory": categories[0] || "WebApplication",
    "operatingSystem": "Web",
    ...(thumbnail && { "image": thumbnail }),
    ...(product.domain_url && { "downloadUrl": product.domain_url }),
    "aggregateRating": product.netVotes > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": Math.min(5, Math.max(1, 3 + (product.netVotes / 20))).toFixed(1),
      "ratingCount": product.netVotes,
      "bestRating": "5",
      "worstRating": "1"
    } : undefined,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://trylaunch.ai"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Products",
        "item": "https://trylaunch.ai/products"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": `https://trylaunch.ai/launch/${product.slug}`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{product.name} - Launch AI</title>
        <meta name="description" content={product.tagline || product.description?.substring(0, 160)} />
        <meta property="og:title" content={`${product.name} - Launch AI`} />
        <meta property="og:description" content={product.tagline || product.description?.substring(0, 160)} />
        <meta property="og:image" content={socialImage} />
        <meta property="og:url" content={`https://trylaunch.ai/launch/${product.slug}`} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} - Launch AI`} />
        <meta name="twitter:description" content={product.tagline || product.description?.substring(0, 160)} />
        <meta name="twitter:image" content={socialImage} />
        <link rel="canonical" href={`https://trylaunch.ai/launch/${product.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-4xl font-bold">{product.name}</h1>
                {bestRanking && bestRanking.rank <= 3 && (
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                    bestRanking.rank === 1 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                    bestRanking.rank === 2 ? 'bg-gray-400/10 text-gray-500 dark:text-gray-400' :
                    'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {bestRanking.rank === 1 ? '🥇 Gold' : bestRanking.rank === 2 ? '🥈 Silver' : '🥉 Bronze'}
                  </span>
                )}
              </div>
              <p className="text-xl text-muted-foreground mt-3">{product.tagline}</p>
              
              {/* Mobile Makers - visible on mobile only */}
              {product.makers && product.makers.length > 0 && (
                <div className="flex items-center gap-2 mt-4 lg:hidden flex-wrap">
                  <span className="text-sm text-muted-foreground">by</span>
                  <div className="flex -space-x-2">
                    {product.makers.slice(0, 3).map((maker: any) => (
                      <Link
                        key={maker.username}
                        to={`/@${maker.username}`}
                        className="hover:z-10"
                      >
                        <Avatar className="h-7 w-7 border-2 border-background hover:ring-2 hover:ring-primary transition-all">
                          <AvatarImage src={maker.avatar_url} alt={maker.username} />
                          <AvatarFallback className="text-xs">{maker.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                      </Link>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {product.makers.map((maker: any, index: number) => (
                      <span key={maker.username}>
                        <Link 
                          to={`/@${maker.username}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          @{maker.username}
                        </Link>
                        {index < product.makers.length - 1 && <span className="text-sm">, </span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {thumbnail && (
              <div className="rounded-xl overflow-hidden border border-border/60">
                <img 
                  src={thumbnail} 
                  alt={product.name}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Built With Stack */}
            {stackItems.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Built With</h2>
                <div className="flex flex-wrap gap-2">
                  {stackItems.map((item) => (
                    <Link key={item.id} to={`/tech/${item.slug}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-sm px-3 py-1">
                        {item.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {product.coupon_code && (
              <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-semibold">Special Offer</h2>
                  <Badge variant="default" className="text-base px-3 py-0.5">
                    {product.coupon_code}
                  </Badge>
                </div>
                {product.coupon_description && (
                  <p className="text-muted-foreground">
                    {product.coupon_description}
                  </p>
                )}
              </div>
            )}

            {embedUrl && (
              <div className="pt-8 border-t border-border/40">
                <h2 className="text-xl font-semibold mb-4">Video</h2>
                <div className="aspect-video rounded-xl overflow-hidden border border-border/60">
                  <iframe
                    src={embedUrl}
                    title="Product video"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            {screenshots.length > 0 && (
              <div className="pt-8 border-t border-border/40">
                <h2 className="text-xl font-semibold mb-4">Screenshots</h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {screenshots.map((screenshot, index) => (
                      <CarouselItem key={index}>
                        <div className="rounded-xl overflow-hidden border border-border/60">
                          <img
                            src={screenshot}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            )}

            {/* Inline Ad Slot */}
            <div className="pt-8">
              <InlineAdSlot />
            </div>

            <div className="space-y-5 pt-10 border-t border-border/40">
              <h2 className="text-xl font-semibold">Comments</h2>
              {user ? (
                <CommentForm productId={product.id} onCommentAdded={handleCommentAdded} />
              ) : (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-3">Login to leave a comment</p>
                  <Button onClick={() => navigate('/auth')}>Login</Button>
                </div>
              )}
              <CommentList productId={product.id} productOwnerId={product.owner_id} refreshTrigger={commentRefreshTrigger} />
            </div>

            {/* Join the Discussion CTA */}
            <div className="p-6 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Join the discussion</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Share your feedback, ask questions, or suggest features on the community forums. Your input helps makers build better products.
                  </p>
                  <Button asChild className="gap-2">
                    <a
                      href={product.forum_thread_url || 'https://forums.trylaunch.ai/'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {product.forum_thread_url ? 'Discuss on Forums →' : 'Visit Community Forums →'}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Desktop Only */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
            <div className="p-5 bg-muted/30 rounded-xl space-y-5">
              {/* Launch Window Status */}
              {product.launch_date && product.status === 'launched' && (
                <div>
                  <LaunchWindowStatus
                    launchDate={product.launch_date}
                    rank={currentRank}
                  />
                  {/* Inline boost upsell during active window */}
                  {isActiveLaunch(product.launch_date) && currentRank && currentRank > 5 && user && product.owner_id === user.id && (
                    <BoostNudgeCard
                      productId={product.id}
                      productName={product.name}
                      rank={currentRank}
                    />
                  )}
                </div>
              )}

              {/* Award Badge */}
              {bestRanking && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Award</h3>
                  <Link to="/awards" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <img
                        src={
                          bestRanking.rank === 1
                            ? '/assets/badge-golden.svg'
                            : bestRanking.rank === 2
                            ? '/assets/badge-silver.png'
                            : '/assets/badge-bronze.png'
                        }
                        alt={bestRanking.period}
                        className="h-14 w-auto"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{bestRanking.period}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {/* Makers */}
              {product.makers && product.makers.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Makers</h3>
                  <div className="space-y-2">
                    {product.makers.map((maker: any) => (
                      <Link
                        key={maker.username}
                        to={`/@${maker.username}`}
                        className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-background transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={maker.avatar_url} alt={maker.username} />
                          <AvatarFallback>{maker.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">@{maker.username}</p>
                          {maker.bio && (
                            <p className="text-xs text-muted-foreground truncate">
                              {maker.bio}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">Categories</h3>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((category) => (
                    <Link 
                      key={category} 
                      to={`/category/${category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
                    >
                      <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 text-xs">
                        {category}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Link 
                        key={tag.id} 
                        to={`/tag/${tag.slug}`}
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-background text-xs">
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {product.languages && product.languages.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Languages</h3>
                  <LanguageDisplay languages={product.languages} size="md" />
                </div>
              )}

              {/* Star Rating */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">Rate this product</h3>
                <StarRating productId={product.id} size="md" />
              </div>

              {/* Voting */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">Support this product</h3>
                <Button
                  onClick={() => handleVote(1)}
                  className="group w-full flex items-center justify-center gap-3 h-14 transition-colors bg-primary text-primary-foreground [@media(hover:hover)]:hover:bg-primary/90"
                >
                  <ArrowUp className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
                  <span className="font-bold text-xl text-primary-foreground">
                    {product.netVotes}
                  </span>
                  <span className="text-sm text-primary-foreground/80">
                    {userVote === 1 ? 'Upvoted!' : 'Upvote'}
                  </span>
                </Button>
              </div>

              {/* Follow Product */}
              <div>
                <Button
                  variant="outline"
                  className="w-full border-2 border-muted-foreground/20"
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow Product'}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                </p>
              </div>

              {/* Discuss this launch */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">💬 Discuss this launch</h3>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-2 border-muted-foreground/20"
                  asChild
                >
                  <a 
                    href={product.forum_thread_url || 'https://forums.trylaunch.ai/'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {product.forum_thread_url ? 'Join the conversation →' : 'Discuss on Forums'}
                  </a>
                </Button>
              </div>

              {/* Visit Website & Share */}
              <div className="flex gap-2">
                {product.domain_url && (
                  <Button 
                    variant="outline"
                    className="flex-1 border-2 border-muted-foreground/20" 
                    asChild
                  >
                    <a 
                      href={product.domain_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // Track website click asynchronously (don't block navigation)
                        supabase.from('product_analytics').insert({
                          product_id: product.id,
                          event_type: 'website_click',
                          visitor_id: localStorage.getItem('visitor_id') || crypto.randomUUID(),
                        }).then(({ error }) => {
                          if (error) console.error('Failed to track click:', error);
                        });
                      }}
                    >
                      Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={`border-2 border-muted-foreground/20 ${product.domain_url ? "w-20" : "w-full"}`}
                  onClick={() => {
                    const ogUrl = `https://gzpypxgdkxdynovploxn.supabase.co/functions/v1/og-share?slug=${product.slug}`;
                    navigator.clipboard.writeText(ogUrl);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  Share
                </Button>
              </div>


              {/* Launch Date */}
              {product.launch_date && (
                <div className="pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <div className="font-medium text-foreground text-xs">Launched</div>
                      <div className="text-xs">{new Date(product.launch_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Best Ranking */}
              {bestRanking && (
                <div className="pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2 text-sm">
                    {bestRanking.rank === 1 ? (
                      <Trophy className="h-4 w-4 text-yellow-500" />
                    ) : bestRanking.rank === 2 ? (
                      <Medal className="h-4 w-4 text-gray-400" />
                    ) : bestRanking.rank === 3 ? (
                      <Award className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-medium text-foreground text-xs flex items-center gap-1.5">
                        #{bestRanking.rank} {bestRanking.period}
                        {bestRanking.rank <= 3 && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            bestRanking.rank === 1 ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' :
                            bestRanking.rank === 2 ? 'bg-gray-400/10 text-gray-500 dark:text-gray-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {bestRanking.rank === 1 ? 'Gold' : bestRanking.rank === 2 ? 'Silver' : 'Bronze'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(bestRanking.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner tools — Analytics, Trackable Link, Verify Revenue */}
              {user && product.owner_id === user.id && (
                <div className="pt-2 space-y-3">
                  {/* Trackable Link */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Link2 className="h-4 w-4 text-primary" />
                      Your Trackable Link
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 bg-background border rounded-md px-2 py-1.5 text-xs font-mono truncate">
                        trylaunch.ai/go/{product.slug}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="shrink-0 h-8 px-2"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://trylaunch.ai/go/${product.slug}`);
                          toast.success('Trackable link copied!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Share this to track clicks with UTM parameters
                    </p>
                  </div>

                  <Button variant="outline" className="w-full gap-2 border-2 border-muted-foreground/20" asChild>
                    <Link to={`/launch/${product.slug}/analytics`}>
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  </Button>
                  {!product.stripe_connect_account_id && (
                    <Button
                      className="w-full gap-2 bg-[#635bff] hover:bg-[#5851db] text-white"
                      asChild
                    >
                      <Link to="/settings?tab=integrations">
                        <DollarSign className="h-4 w-4" />
                        Verify Revenue
                      </Link>
                    </Button>
                  )}
                </div>
              )}

            </div>

            {/* Sidebar Sponsored Ads */}
            <SidebarSponsoredAd />

            {/* Advertise CTA */}
            <AdvertiseCTA compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;
