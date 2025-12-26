import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2, Unlink, RefreshCw, DollarSign, CheckCircle, ShieldCheck } from 'lucide-react';
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
      
      toast.success('Stripe account connected! MRR verified.');
      await fetchProducts();
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
                    size="sm"
                    onClick={() => handleConnect(product.id)}
                    disabled={actionLoading === product.id}
                    className="bg-[#635bff] hover:bg-[#5851db] text-white"
                  >
                    <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                    {actionLoading === product.id ? 'Connecting...' : 'Verify Revenue'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
