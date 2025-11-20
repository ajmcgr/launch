import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, ExternalLink, Calendar } from 'lucide-react';

const MyProducts = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Please login to view your products');
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchProducts(session.user.id);
      }
    });
  }, [navigate]);

  const fetchProducts = async (userId: string) => {
    setLoading(true);
    try {
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          *,
          product_media(url, type),
          product_category_map(
            product_categories(name)
          )
        `)
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get vote counts for launched products
      const launchedProducts = productsData?.filter(p => p.status === 'launched') || [];
      const productIds = launchedProducts.map(p => p.id);
      
      let voteCounts: Record<string, number> = {};
      if (productIds.length > 0) {
        const { data: votesData } = await supabase
          .from('votes')
          .select('product_id, value')
          .in('product_id', productIds);

        votesData?.forEach(vote => {
          voteCounts[vote.product_id] = (voteCounts[vote.product_id] || 0) + vote.value;
        });
      }

      const formattedProducts = productsData?.map(product => ({
        ...product,
        thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
        categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
        netVotes: voteCounts[product.id] || 0,
      })) || [];

      setProducts(formattedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'default',
      launched: 'outline',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const canEdit = (product: any) => {
    if (product.status === 'draft') return true;
    if (product.status === 'scheduled') {
      // Can edit until 1 hour before launch
      const launchDate = new Date(product.launch_date);
      const oneHourBefore = new Date(launchDate.getTime() - 60 * 60 * 1000);
      return new Date() < oneHourBefore;
    }
    return false;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Products</h1>
          <Button asChild>
            <Link to="/submit">
              <Plus className="h-4 w-4 mr-2" />
              Submit New Product
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : products.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">No Products Yet</h2>
              <p className="text-muted-foreground mb-6">
                Ready to launch your product? Submit it now and get in front of thousands of founders.
              </p>
              <Button asChild size="lg">
                <Link to="/submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Your First Product
                </Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {product.thumbnail && (
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-2xl">{product.name}</CardTitle>
                          {getStatusBadge(product.status)}
                        </div>
                        <p className="text-muted-foreground mb-3">{product.tagline}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {product.categories.slice(0, 3).map((category: string) => (
                            <Badge key={category} variant="secondary">
                              {category}
                            </Badge>
                          ))}
                        </div>
                        {product.launch_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {product.status === 'launched' ? 'Launched' : 'Scheduled for'}{' '}
                              {new Date(product.launch_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                        {product.status === 'launched' && (
                          <div className="mt-2">
                            <span className="font-semibold">{product.netVotes}</span>
                            <span className="text-muted-foreground ml-1">votes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {product.status === 'launched' && (
                      <Button variant="outline" asChild>
                        <Link to={`/launch/${product.slug}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Launch
                        </Link>
                      </Button>
                    )}
                    {canEdit(product) && (
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    {product.status === 'draft' && (
                      <Button>Continue Submission</Button>
                    )}
                    {product.status === 'launched' && (
                      <Button variant="outline" asChild>
                        <Link to="/pricing">
                          Relaunch
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProducts;
