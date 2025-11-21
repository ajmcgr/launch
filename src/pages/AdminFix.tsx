import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminFix = () => {
  const [loading, setLoading] = useState(false);

  const fixMediaProduct = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'published',
          launch_date: new Date().toISOString(),
        })
        .eq('slug', 'media');

      if (error) throw error;

      toast.success('Product "Media" has been published!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

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
