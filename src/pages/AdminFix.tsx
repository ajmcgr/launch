import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminFix = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Please login first');
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const fixMediaProduct = async () => {
    if (!user) {
      toast.error('Please login first');
      return;
    }

    setLoading(true);
    try {
      // First check if product exists and user owns it
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, owner_id, status')
        .eq('slug', 'media')
        .single();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        toast.error(`Product not found: ${fetchError.message}`);
        return;
      }

      if (product.owner_id !== user.id) {
        toast.error('You do not own this product');
        return;
      }

      console.log('Product found:', product);
      console.log('Current status:', product.status);

      // Update the product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          status: 'published',
          launch_date: new Date().toISOString(),
        })
        .eq('slug', 'media')
        .eq('owner_id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error(`Failed to update: ${updateError.message}`);
        return;
      }

      toast.success('Product "Media" has been published! Redirecting...');
      setTimeout(() => {
        navigate('/me/products');
      }, 2000);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(`Failed to update product: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="p-8">
          <h1 className="text-2xl font-bold mb-4">Admin Fix</h1>
          <p className="text-muted-foreground mb-6">
            Click the button below to manually publish your "Media" product.
          </p>
          <Button onClick={fixMediaProduct} disabled={loading}>
            {loading ? 'Updating...' : 'Publish Media Product'}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default AdminFix;
