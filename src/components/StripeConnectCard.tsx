import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Unlink, RefreshCw, DollarSign, CheckCircle, ShieldCheck, Settings2 } from 'lucide-react';
import { formatMRRRange } from '@/lib/revenue';

interface Product {
  id: string;
  name: string | null;
  stripe_connect_account_id: string | null;
  stripe_product_id: string | null;
  verified_mrr: number | null;
  mrr_verified_at: string | null;
}

interface StripeConnectCardProps {
  userId: string;
}

export const StripeConnectCard = ({ userId }: StripeConnectCardProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [stripeProductIdInput, setStripeProductIdInput] = useState('');

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
      // Clean up URL
      window.history.replaceState({}, '', '/settings');
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
    }
    setLoading(false);
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    setActionLoading('callback');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'callback', code, state }
      });

      if (error) throw error;
      toast.success('Stripe account connected successfully!');
      fetchProducts();
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

  const handleSetStripeProductId = async (productId: string) => {
    setActionLoading(productId);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
        body: { action: 'set-stripe-product', productId, stripeProductId: stripeProductIdInput.trim() || null }
      });

      if (error) throw error;
      toast.success('Stripe Product ID updated and MRR refreshed!');
      setEditingProductId(null);
      setStripeProductIdInput('');
      fetchProducts();
    } catch (error: any) {
      console.error('Set Stripe Product ID error:', error);
      toast.error(error.message || 'Failed to update Stripe Product ID');
    } finally {
      setActionLoading(null);
    }
  };

  const startEditingProductId = (product: Product) => {
    setEditingProductId(product.id);
    setStripeProductIdInput(product.stripe_product_id || '');
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Verified Revenue
        </CardTitle>
        <CardDescription>
          Connect your Stripe account to display verified MRR on your product pages. This increases trust and helps buyers understand your product's traction.
        </CardDescription>
        <div className="flex items-start gap-2 mt-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
          <p>
            <strong>Privacy note:</strong> We only read your subscription data to calculate MRR. We never create charges, access customer details, or modify your Stripe account in any way.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="p-4 border rounded-lg space-y-3"
          >
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
                  <p className="text-sm text-muted-foreground">
                    Not connected
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {product.stripe_connect_account_id ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditingProductId(product)}
                      disabled={actionLoading === product.id}
                      title="Configure which Stripe product to track"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
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

            {/* Stripe Product ID configuration */}
            {product.stripe_connect_account_id && editingProductId === product.id && (
              <div className="pt-3 border-t space-y-2">
                <label className="text-sm font-medium">Stripe Product ID (optional)</label>
                <p className="text-xs text-muted-foreground">
                  Filter MRR to only count subscriptions for a specific Stripe product. Find your Product ID in{' '}
                  <a 
                    href="https://dashboard.stripe.com/products" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                  >
                    Stripe Dashboard → Products
                  </a>{' '}
                  (starts with "prod_"). Leave empty to count all subscriptions.
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="prod_xxxxxxxxxxxxx"
                    value={stripeProductIdInput}
                    onChange={(e) => setStripeProductIdInput(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSetStripeProductId(product.id)}
                    disabled={actionLoading === product.id}
                  >
                    {actionLoading === product.id ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingProductId(null);
                      setStripeProductIdInput('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {product.stripe_product_id && (
                  <p className="text-xs text-muted-foreground">
                    Currently filtering by: <code className="bg-muted px-1 rounded">{product.stripe_product_id}</code>
                  </p>
                )}
              </div>
            )}

            {/* Show current filter if set but not editing */}
            {product.stripe_connect_account_id && product.stripe_product_id && editingProductId !== product.id && (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Filtering by Stripe Product: <code className="bg-muted px-1 rounded">{product.stripe_product_id}</code>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
