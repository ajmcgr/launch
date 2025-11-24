import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit, ExternalLink, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import defaultIcon from '@/assets/default-product-icon.png';
import ProductBadgeEmbed from '@/components/ProductBadgeEmbed';

const MyProducts = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'day' | 'month' | 'year' | 'all'>('all');
  const [rescheduleDialog, setRescheduleDialog] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('09:00');

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

  useEffect(() => {
    // Check for successful payment and refresh once
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true' && user) {
      toast.success('Payment successful! Your product has been scheduled.');
      window.history.replaceState({}, '', '/my-products');
      setTimeout(() => {
        fetchProducts(user.id);
      }, 1000);
    }
  }, []);

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
        won_daily: product.won_daily || false,
        won_weekly: product.won_weekly || false,
        won_monthly: product.won_monthly || false,
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
          productId: product.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
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

      // Check if product already has an order (already paid)
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existingOrder) {
        // Already paid, open date picker
        openRescheduleDialog(product);
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
          productId: product.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
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

      // Check if product already has an order (already paid)
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existingOrder) {
        // Already paid, just update status to scheduled
        const { error } = await supabase
          .from('products')
          .update({ status: 'scheduled' })
          .eq('id', product.id);

        if (error) throw error;
        
        toast.success('Product scheduled successfully!');
        if (user) fetchProducts(user.id);
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
          productId: product.id,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  const handlePauseLaunch = async (product: any) => {
    if (!confirm('Are you sure you want to pause this launch? You can resume it later.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'draft',
          launch_date: null,
        })
        .eq('id', product.id);

      if (error) throw error;

      toast.success('Launch paused successfully');
      if (user) fetchProducts(user.id);
    } catch (error) {
      console.error('Pause error:', error);
      toast.error('Failed to pause launch');
    }
  };

  const openRescheduleDialog = (product: any) => {
    const launchDate = product.launch_date ? new Date(product.launch_date) : undefined;
    setSelectedDate(launchDate);
    if (launchDate) {
      setSelectedTime(`${String(launchDate.getHours()).padStart(2, '0')}:${String(launchDate.getMinutes()).padStart(2, '0')}`);
    } else {
      setSelectedTime('09:00');
    }
    setRescheduleDialog({ open: true, product });
  };

  const handleRescheduleLaunch = async () => {
    if (!selectedDate || !rescheduleDialog.product) return;

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes, 0, 0);

      if (newDate <= new Date()) {
        toast.error('Launch date must be in the future');
        return;
      }

      const { error } = await supabase
        .from('products')
        .update({
          status: 'scheduled',
          launch_date: newDate.toISOString(),
        })
        .eq('id', rescheduleDialog.product.id);

      if (error) throw error;

      toast.success('Launch scheduled successfully');
      setRescheduleDialog({ open: false, product: null });
      if (user) fetchProducts(user.id);
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error('Failed to schedule launch');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
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

  const filterProductsByPeriod = (products: any[], period: 'day' | 'month' | 'year' | 'all') => {
    if (period === 'all') return products;
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
    }
    
    return products.filter(product => {
      if (product.status !== 'launched' || !product.launch_date) return false;
      return new Date(product.launch_date) >= startDate;
    });
  };

  const filteredProducts = filterProductsByPeriod(products, timePeriod);

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
          <>
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)} className="mb-6">
              <TabsList>
                <TabsTrigger value="all">All Products</TabsTrigger>
                <TabsTrigger value="day">Today</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
                <TabsTrigger value="year">This Year</TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <h2 className="text-2xl font-bold mb-4">No Products Found</h2>
                  <p className="text-muted-foreground">
                    No launched products found for this time period.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredProducts.map((product) => (
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
                  <div className="flex gap-3 flex-wrap">
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
                    {product.status === 'scheduled' && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openRescheduleDialog(product);
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Re-schedule
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePauseLaunch(product);
                          }}
                        >
                          Pause Launch
                        </Button>
                      </>
                    )}
                    {canEdit(product) && product.status !== 'scheduled' && (
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
                  {product.status === 'launched' && product.slug && (
                    <ProductBadgeEmbed 
                      productSlug={product.slug}
                      productName={product.name}
                      categories={product.categories}
                      wonDaily={product.won_daily}
                      wonWeekly={product.won_weekly}
                      wonMonthly={product.won_monthly}
                    />
                  )}
                </CardContent>
              </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialog.open} onOpenChange={(open) => setRescheduleDialog({ open, product: null })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {rescheduleDialog.product?.status === 'scheduled' ? 'Reschedule Launch' : 'Schedule Launch'}
            </DialogTitle>
            <DialogDescription>
              Choose a date and time for {rescheduleDialog.product?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Launch Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Launch Time (UTC)</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialog({ open: false, product: null })}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleLaunch} disabled={!selectedDate}>
              {rescheduleDialog.product?.status === 'scheduled' ? 'Reschedule' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;
