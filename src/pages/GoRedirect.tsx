import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const GoRedirect = () => {
  const { slug } = useParams();
  const [error, setError] = useState(false);

  useEffect(() => {
    const redirect = async () => {
      if (!slug) {
        setError(true);
        return;
      }

      // Fetch product domain URL (any status — links must not break)
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, domain_url')
        .eq('slug', slug)
        .maybeSingle();

      if (fetchError || !product?.domain_url) {
        setError(true);
        return;
      }

      // Build destination URL with UTM params (tolerate missing protocol)
      let destination = product.domain_url.trim();
      if (!/^https?:\/\//i.test(destination)) destination = `https://${destination}`;
      try {
        const destUrl = new URL(destination);
        destUrl.searchParams.set('utm_source', 'trylaunch');
        destUrl.searchParams.set('utm_medium', 'referral');
        destUrl.searchParams.set('utm_campaign', slug);
        destination = destUrl.toString();
      } catch {
        // keep raw destination
      }

      // Track the referral click (never block or delay the redirect)
      try {
        void supabase.from('product_analytics').insert({
          product_id: product.id,
          event_type: 'referral_click',
          visitor_id: crypto.randomUUID(),
          metadata: {
            source: 'trackable_link',
            referrer: document.referrer || 'direct',
          },
        });
      } catch (e) {
        console.error('Tracking error:', e);
      }

      window.location.replace(destination);

    };

    redirect();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <p className="text-muted-foreground">This link doesn't point to an active product.</p>
          <a href="/" className="text-primary underline">Go to homepage</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="h-6 w-6 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    </div>
  );
};

export default GoRedirect;
