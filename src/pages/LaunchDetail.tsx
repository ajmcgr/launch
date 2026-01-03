import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ArrowUp, ExternalLink, Calendar, Star, MessageSquare } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { CommentForm } from '@/components/CommentForm';
import { CommentList } from '@/components/CommentList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyProductFollow, notifyProductVote } from '@/lib/notifications';

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
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

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

        // Fetch vote counts
        const { data: voteData } = await supabase
          .from('product_vote_counts')
          .select('net_votes')
          .eq('product_id', productData.id)
          .maybeSingle();

        // Fetch user's vote if authenticated
        if (user) {
          const { data: userVoteData } = await supabase
            .from('votes')
            .select('value')
            .eq('product_id', productData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setUserVote((userVoteData?.value as 1 | -1) || null);

          // Check if user follows this product
          const { data: followData } = await supabase
            .from('product_follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('product_id', productData.id)
            .maybeSingle();
          
          setIsFollowing(!!followData);
        }

        // Get follower count for this product
        const { count: followersCount } = await supabase
          .from('product_follows')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', productData.id);

        setFollowerCount(followersCount || 0);

        setProduct({
          ...productData,
          netVotes: voteData?.net_votes || 0,
          makers: productData.product_makers?.map((m: any) => m.users).filter((maker: any) => maker && maker.username) || []
        });
      } catch (error) {
        console.error('Error:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, navigate, user]);

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

      // Send notification if upvoting
      if (newVote === 1 && userVote !== 1) {
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (userData?.username) {
          notifyProductVote(product.id, userData.username);
        }
      }
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

        // Send notification to product owner
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();

        if (userData?.username) {
          notifyProductFollow(product.id, userData.username);
        }
      }
    } catch (error: any) {
      console.error('Error following/unfollowing:', error);
      toast.error('Failed to update follow status');
    }
  };


  if (!product) {
    return null;
  }

  const thumbnail = product.product_media?.find((m: any) => m.type === 'thumbnail')?.url;
  const screenshots = product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [];
  const videoUrl = product.product_media?.find((m: any) => m.type === 'video')?.url;
  
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
    <div className="min-h-screen bg-background py-8">
      <Helmet>
        <title>{product.name} - Launch AI</title>
        <meta name="description" content={product.tagline || product.description?.substring(0, 160)} />
        <meta property="og:title" content={`${product.name} - Launch AI`} />
        <meta property="og:description" content={product.tagline || product.description?.substring(0, 160)} />
        {thumbnail && <meta property="og:image" content={thumbnail} />}
        <meta property="og:url" content={`https://trylaunch.ai/launch/${product.slug}`} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} - Launch AI`} />
        <meta name="twitter:description" content={product.tagline || product.description?.substring(0, 160)} />
        {thumbnail && <meta name="twitter:image" content={thumbnail} />}
        <link rel="canonical" href={`https://trylaunch.ai/launch/${product.slug}`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              <p className="text-xl text-muted-foreground">{product.tagline}</p>
            </div>

            {thumbnail && (
              <div className="rounded-xl overflow-hidden">
                <img 
                  src={thumbnail} 
                  alt={product.name}
                  className="w-full aspect-video object-cover"
                />
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold mb-3">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {product.coupon_code && (
              <div className="p-5 bg-primary/5 rounded-xl">
                <div className="flex items-start justify-between mb-2">
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
              <div>
                <h2 className="text-xl font-semibold mb-3">Video</h2>
                <div className="aspect-video rounded-xl overflow-hidden">
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
              <div>
                <h2 className="text-xl font-semibold mb-3">Screenshots</h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {screenshots.map((screenshot, index) => (
                      <CarouselItem key={index}>
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full rounded-xl"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
            )}

            <div className="space-y-4 pt-6 border-t border-border/50">
              <h2 className="text-xl font-semibold">Comments</h2>
              {user ? (
                <CommentForm productId={product.id} onCommentAdded={handleCommentAdded} />
              ) : (
                <div className="p-4 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-3">Login to leave a comment</p>
                  <Button onClick={() => navigate('/auth')}>Login</Button>
                </div>
              )}
              <CommentList productId={product.id} refreshTrigger={commentRefreshTrigger} />
            </div>
          </div>

          {/* Right Sidebar - Desktop Only */}
          <div className="lg:col-span-1">
            <div className="p-5 bg-muted/30 rounded-xl sticky top-6 space-y-6">
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
                          <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
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

              {/* Voting */}
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">Upvote this product</h3>
                <div className="flex items-center gap-2 bg-background rounded-lg p-2 w-full justify-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 w-10 p-0 hover:bg-primary/10"
                    onClick={() => handleVote(1)}
                  >
                    <ArrowUp className={`h-5 w-5 ${userVote === 1 ? 'text-primary' : ''}`} />
                  </Button>
                  <span className="font-bold text-lg min-w-[3rem] text-center">
                    {product.netVotes}
                  </span>
                </div>
              </div>

              {/* Follow Product */}
              <div>
                <Button
                  variant={isFollowing ? 'outline' : 'default'}
                  className="w-full"
                  onClick={handleFollow}
                >
                  <Star className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow Product'}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                </p>
              </div>

              {/* Discuss on Forums */}
              <div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  asChild
                >
                  <a href="https://forums.trylaunch.ai/" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4" />
                    Discuss on Forums
                  </a>
                </Button>
              </div>

              {/* Visit Website & Share */}
              <div className="flex gap-2">
                {product.domain_url && (
                  <Button 
                    className="flex-1" 
                    onClick={async () => {
                      // Track website click
                      try {
                        await supabase.from('product_analytics').insert({
                          product_id: product.id,
                          event_type: 'website_click',
                          visitor_id: localStorage.getItem('visitor_id') || crypto.randomUUID(),
                        });
                      } catch (error) {
                        console.error('Failed to track click:', error);
                      }
                      window.open(product.domain_url, '_blank', 'noopener');
                    }}
                  >
                    Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={product.domain_url ? "w-20" : "w-full"}
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard.writeText(url);
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;
