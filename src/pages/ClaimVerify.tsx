import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function ClaimVerify() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('Missing verification token.');
      return;
    }
    (async () => {
      const { data, error } = await supabase.functions.invoke('verify-product-claim', { body: { token } });
      if (error || (data && data.error)) {
        setState('error');
        setMessage((data && data.error) || error?.message || 'Verification failed.');
        return;
      }
      setState('success');
      setSlug(data?.productSlug || null);
      setName(data?.productName || null);
    })();
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground" />
          <h1 className="font-reckless text-2xl mt-6">Verifying your claim…</h1>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
          <h1 className="font-reckless text-2xl mt-6">Claim verified</h1>
          <p className="text-muted-foreground mt-2">
            {name ? `${name} is now linked to your account.` : 'This launch is now linked to your account.'}
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            {slug && (
              <Button asChild>
                <Link to={`/launch/${slug}`}>View launch</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/my-products">My launches</Link>
            </Button>
          </div>
        </>
      )}
      {state === 'error' && (
        <>
          <XCircle className="w-12 h-12 mx-auto text-destructive" />
          <h1 className="font-reckless text-2xl mt-6">Couldn't verify</h1>
          <p className="text-muted-foreground mt-2">{message}</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </>
      )}
    </div>
  );
}
