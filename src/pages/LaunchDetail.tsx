import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, ExternalLink, Calendar } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { CommentForm } from '@/components/CommentForm';
import { CommentList } from '@/components/CommentList';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LaunchDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

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

        // Fetch vote counts
        const { data: voteData } = await supabase
          .from('product_vote_counts')
          .select('net_votes')
          .eq('product_id', productData.id)
          .single();

        setProduct({
          ...productData,
          netVotes: voteData?.net_votes || 0,
          makers: productData.product_makers?.map((m: any) => m.users) || []
        });
      } catch (error) {
        console.error('Error:', error);
        navigate('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, navigate]);

  const handleCommentAdded = () => {
    setCommentRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const thumbnail = product.product_media?.find((m: any) => m.type === 'thumbnail')?.url;
  const screenshots = product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {thumbnail && (
              <Card className="overflow-hidden">
                <img 
                  src={thumbnail} 
                  alt={product.name}
                  className="w-full aspect-video object-cover"
                />
              </Card>
            )}

            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
                  <p className="text-xl text-muted-foreground">{product.tagline}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 border rounded-lg p-2">
                  <Button
                    size="sm"
                    variant={product.userVote === 1 ? 'default' : 'outline'}
                    className="h-10 w-10 p-0"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                  <span className="font-bold text-lg min-w-[3rem] text-center">
                    {product.netVotes}
                  </span>
                  <Button
                    size="sm"
                    variant={product.userVote === -1 ? 'destructive' : 'outline'}
                    className="h-10 w-10 p-0"
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </div>

                {product.domain_url && (
                  <Button size="lg" asChild>
                    <a href={product.domain_url} target="_blank" rel="noopener noreferrer">
                      Visit Website <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>

              {product.launch_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <Calendar className="h-4 w-4" />
                  <span>Launched on {new Date(product.launch_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">About</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </Card>

            {screenshots.length > 0 && (
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
                <Carousel className="w-full">
                  <CarouselContent>
                    {screenshots.map((screenshot, index) => (
                      <CarouselItem key={index}>
                        <img
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full rounded-lg"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Comments</h2>
              {user ? (
                <CommentForm productId={product.id} onCommentAdded={handleCommentAdded} />
              ) : (
                <Card className="p-4">
                  <p className="text-muted-foreground mb-3">Login to leave a comment</p>
                  <Button onClick={() => navigate('/auth')}>Login</Button>
                </Card>
              )}
              <CommentList productId={product.id} refreshTrigger={commentRefreshTrigger} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4">Makers</h2>
              <div className="space-y-4">
                {product.makers.map((maker) => (
                  <Link
                    key={maker.username}
                    to={`/u/${maker.username}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={maker.avatar_url} alt={maker.username} />
                      <AvatarFallback>{maker.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">@{maker.username}</p>
                      {maker.bio && (
                        <p className="text-sm text-muted-foreground truncate">
                          {maker.bio}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LaunchDetail;
