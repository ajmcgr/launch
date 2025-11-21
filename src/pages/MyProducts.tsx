import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, ExternalLink, Calendar, Trash2 } from 'lucide-react';
import defaultIcon from '@/assets/default-product-icon.png';

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
        iconUrl: product.product_media?.find((m: any) => m.type === 'icon')?.url || '',
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

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete associated media
      await supabase.from('product_media').delete().eq('product_id', productId);
      
      // Delete category mappings
      await supabase.from('product_category_map').delete().eq('product_id', productId);
      
      // Delete the product
      const { error } = await supabase.from('products').delete().eq('id', productId);
      
      if (error) throw error;
      
      toast.success('Draft deleted successfully');
      if (user) fetchProducts(user.id);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete draft');
    }
  };

  const handleRelaunch = async (product: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in again');
        navigate('/auth?mode=signin');
        return;
      }
      
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: 'relaunch',
          selectedDate: null,
          productData: {
            name: product.name,
            tagline: product.tagline,
            url: product.domain_url,
            description: product.description,
            categories: product.categories,
            slug: product.slug,
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Checkout opened in new window. Complete payment to relaunch your product!');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  const handleLaunch = async (product: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in again');
        navigate('/auth?mode=signin');
        return;
      }
      
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: 'skip',
          selectedDate: null,
          productData: {
            name: product.name,
            tagline: product.tagline,
            url: product.domain_url,
            description: product.description,
            categories: product.categories,
            slug: product.slug,
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Checkout opened in new window. Complete payment to launch your product!');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  const handleScheduleLine = async (product: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in again');
        navigate('/auth?mode=signin');
        return;
      }
      
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: 'join',
          selectedDate: null,
          productData: {
            name: product.name,
            tagline: product.tagline,
            url: product.domain_url,
            description: product.description,
            categories: product.categories,
            slug: product.slug,
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Checkout opened in new window. Complete payment to schedule your product!');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
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
    // Drafts are always editable
    if (product.status === 'draft') return true;
    
    // Scheduled products are editable until launch
    if (product.status === 'scheduled') {
      const launchDate = new Date(product.launch_date);
      return new Date() < launchDate;
    }
    
    return false;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
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
              <Card key={product.id} className={product.status === 'launched' && product.slug ? 'hover:shadow-md transition-shadow' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {product.status === 'launched' && product.slug ? (
                        <Link to={`/launch/${product.slug}`} className="contents">
                          <div className="w-32 h-32 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: '#545454' }}>
                            {product.iconUrl ? (
                              <img
                                src={product.iconUrl}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <img
                                src={defaultIcon}
                                alt="Default product icon"
                                className="w-24 h-24 object-contain"
                              />
                            )}
                          </div>
                        </Link>
                      ) : (
                        <div className="w-32 h-32 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: '#545454' }}>
                          {product.iconUrl ? (
                            <img
                              src={product.iconUrl}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <img
                              src={defaultIcon}
                              alt="Default product icon"
                              className="w-24 h-24 object-contain"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          {product.status === 'launched' && product.slug ? (
                            <Link to={`/launch/${product.slug}`}>
                              <CardTitle className="text-2xl hover:text-primary transition-colors cursor-pointer">
                                {product.name}
                              </CardTitle>
                            </Link>
                          ) : (
                            <CardTitle className="text-2xl">{product.name}</CardTitle>
                          )}
                          {getStatusBadge(product.status)}
                        </div>
                        <p className="text-muted-foreground mb-3">{product.tagline}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {product.categories.slice(0, 3).map((category: string) => (
                            <Link 
                              key={category} 
                              to={`/products?category=${encodeURIComponent(category)}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                                {category}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Created {new Date(product.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {product.launch_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
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
                      <>
                        <Button 
                          variant="outline" 
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link to={`/launch/${product.slug}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Launch
                          </Link>
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRelaunch(product);
                          }}
                        >
                          Relaunch
                        </Button>
                      </>
                    )}
                    {canEdit(product) && (
                      <Button 
                        variant="outline" 
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link to={`/submit?draft=${product.id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </Button>
                    )}
                    {product.status === 'draft' && (
                      <>
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLaunch(product);
                          }}
                        >
                          Schedule Launch
                        </Button>
                        <Button 
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleScheduleLine(product);
                          }}
                        >
                          Join The Line
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(product.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
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
