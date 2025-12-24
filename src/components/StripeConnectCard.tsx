import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Unlink, RefreshCw, DollarSign, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { formatMRRRange } from '@/lib/revenue';

interface Product {
  id: string;
  name: string | null;
  stripe_connect_account_id: string | null;
  stripe_product_id: string | null;
  verified_mrr: number | null;
  mrr_verified_at: string | null;
}

interface StripeProduct {
  id: string;
  name: string;
  subscriptionCount: number;
}

interface StripeConnectCardProps {
  userId: string;
}

export const StripeConnectCard = ({ userId }: StripeConnectCardProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stripeProducts, setStripeProducts] = useState<Record<string, StripeProduct[]>>({});
  const [loadingStripeProducts, setLoadingStripeProducts] = useState<string | null>(null);
  
  // Product selection modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [pendingStripeProducts, setPendingStripeProducts] = useState<StripeProduct[]>([]);
  const [selectedStripeProducts, setSelectedStripeProducts] = useState<string[]>([]);
  const [selectedStripeProduct, setSelectedStripeProduct] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isCallback = urlParams.get('stripe_callback');
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (isCallback && code && state) {
      handleOAuthCallback(code, state);
      window.history.replaceState({}, '', '/settings?tab=integrations');
    }
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, stripe_connect_account_id, stripe_product_id, verified_mrr, mrr_verified_at')
      .eq('owner_id', userId);

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
      // Auto-fetch Stripe products for connected accounts
      for (const product of data || []) {
        if (product.stripe_connect_account_id && !stripeProducts[product.id]) {
          fetchStripeProducts(product.id);
        }
      }
    }
    setLoading(false);
  };

  const fetchStripeProducts = async (productId: string) => {
    setLoadingStripeProducts(productId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'list-stripe-products', productId }
      });

      if (error) throw error;
      setStripeProducts(prev => ({ ...prev, [productId]: data.products || [] }));
      return data.products || [];
    } catch (error: any) {
      console.error('Error fetching Stripe products:', error);
      return [];
    } finally {
      setLoadingStripeProducts(null);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setActionLoading('callback');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'callback', code, state }
      });

      if (error) throw error;
      
      // Parse state to get productId
      const stateData = JSON.parse(atob(state));
      const productId = stateData.productId;
      
      toast.success('Stripe account connected! Now select which product to track.');
      
      // Refresh products first
      await fetchProducts();
      
      // Fetch Stripe products and show selection modal
      const stripeProds = await fetchStripeProducts(productId);
      if (stripeProds.length > 0) {
        setPendingProductId(productId);
        setPendingStripeProducts(stripeProds);
        // Auto-select all products with subscriptions
        const prodsWithSubs = stripeProds.filter(p => p.subscriptionCount > 0).map(p => p.id);
        setSelectedStripeProducts(prodsWithSubs.length > 0 ? prodsWithSubs : [stripeProds[0].id]);
        setShowProductModal(true);
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      toast.error(error.message || 'Failed to connect Stripe account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnect = async (productId: string) => {
    setActionLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'connect', productId }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      toast.error(error.message || 'Failed to initiate Stripe Connect');
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (productId: string) => {
    setActionLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'disconnect', productId }
      });

      if (error) throw error;
      toast.success('Stripe account disconnected');
      setStripeProducts(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      fetchProducts();
    } catch (error: any) {
      console.error('Disconnect error:', error);
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async (productId: string) => {
    setActionLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'refresh', productId }
      });

      if (error) throw error;
      toast.success('Revenue data refreshed!');
      fetchProducts();
    } catch (error: any) {
      console.error('Refresh error:', error);
      toast.error(error.message || 'Failed to refresh revenue');
    } finally {
      setActionLoading(null);
    }
  };

  // Removed handleProductSelect - now handled via modal only

  const toggleStripeProduct = (productId: string) => {
    setSelectedStripeProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleModalConfirm = async () => {
    if (!pendingProductId || selectedStripeProducts.length === 0) return;
    
    setActionLoading(pendingProductId);
    try {
      // Join selected products as comma-separated string
      const stripeProductId = selectedStripeProducts.join(',');
      
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { 
          action: 'set-stripe-product', 
          productId: pendingProductId, 
          stripeProductId
        }
      });

      if (error) throw error;
      toast.success('Revenue verified successfully!');
      setShowProductModal(false);
      setPendingProductId(null);
      setPendingStripeProducts([]);
      setSelectedStripeProducts([]);
      fetchProducts();
    } catch (error: any) {
      console.error('Set product error:', error);
      toast.error(error.message || 'Failed to set product');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading products...
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Verified Revenue
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to display verified revenue on your product pages
          </CardDescription>
          <div className="flex items-start gap-2 mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <p>
              <strong>Privacy note:</strong> We only read your subscription data to calculate MRR. We never create charges, access customer details, or modify your Stripe account.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You don't have any products yet. Create a product first to connect Stripe.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Product Selection Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Stripe Product</DialogTitle>
            <DialogDescription>
              Choose which Stripe product's MRR you want to display for this launch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Select the Stripe products to include in MRR calculation:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pendingStripeProducts.map((sp) => (
                <label 
                  key={sp.id} 
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox 
                    checked={selectedStripeProducts.includes(sp.id)}
                    onCheckedChange={() => toggleStripeProduct(sp.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{sp.name}</p>
                    <p className="text-sm text-muted-foreground">{sp.subscriptionCount} active subscriptions</p>
                  </div>
                </label>
              ))}
            </div>
            <Button 
              onClick={handleModalConfirm} 
              disabled={selectedStripeProducts.length === 0 || actionLoading === pendingProductId}
              className="w-full"
            >
              {actionLoading === pendingProductId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                `Confirm & Verify Revenue (${selectedStripeProducts.length} selected)`
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Verified Revenue
          </CardTitle>
          <CardDescription>
            Connect your Stripe account to display verified MRR on your product pages.
          </CardDescription>
          <div className="flex items-start gap-2 mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
            <p>
              <strong>Privacy note:</strong> We only read your subscription data to calculate MRR. We never create charges, access customer details, or modify your Stripe account.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">{product.name || 'Unnamed Product'}</p>
                  {product.stripe_connect_account_id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        Connected
                      </Badge>
                      {product.verified_mrr !== null && (
                        <Badge variant="outline">
                          MRR: {formatMRRRange(product.verified_mrr)}
                        </Badge>
                      )}
                      {product.mrr_verified_at && (
                        <span className="text-xs text-muted-foreground">
                          Updated {new Date(product.mrr_verified_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {product.stripe_connect_account_id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefresh(product.id)}
                        disabled={actionLoading === product.id}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${actionLoading === product.id ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(product.id)}
                        disabled={actionLoading === product.id}
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleConnect(product.id)}
                      disabled={actionLoading === product.id}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      {actionLoading === product.id ? 'Connecting...' : 'Connect Stripe'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stripe Product Info - shown when connected */}
              {product.stripe_connect_account_id && product.stripe_product_id && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Tracking: {product.stripe_product_id.split(',').length} product(s)</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};
