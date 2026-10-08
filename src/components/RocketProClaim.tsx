import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { rocketStatus, startRocketLogin } from '@/lib/rocketAcceptance';
import { Button } from '@/components/ui/button';

export default function RocketProClaim({ onFulfilled }: { onFulfilled: () => void }) {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<Array<{ purchase_id: string }>>([]);
  const [drafts, setDrafts] = useState<Array<{ id: string; name: string }>>([]);
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reauth, setReauth] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      const status = await rocketStatus();
      if (!active) return;
      setReauth(status.reauth_required && !!localStorage.getItem('launch:rocket:pending-purchase'));
      if (!status.purchases.length) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [products, orders] = await Promise.all([
        supabase.from('products').select('id,name').eq('owner_id', user.id).eq('status', 'draft'),
        supabase.from('orders').select('product_id').eq('user_id', user.id),
      ]);
      if (products.error || orders.error) throw new Error('Unable to load purchases');
      if (!active) return;
      setPurchases(status.purchases);
      setDrafts(products.data.filter(p => !orders.data.some(o => o.product_id === p.id)));
    })().catch(() => { if (active) setError('Rocket purchases could not be verified. Please try again later.'); });
    return () => { active = false; };
  }, []);
  const claim = async () => {
    if (!productId || !purchases.length || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('launch-rocket-access', {
        body: { action: 'fulfil', product_id: productId, purchase_id: purchases[0].purchase_id },
      });
      if (invokeError || !data?.order_id) throw new Error('Purchase unavailable');
      localStorage.removeItem('launch:rocket:pending-purchase');
      onFulfilled();
      navigate(`/submit?draft=${encodeURIComponent(productId)}&step=4`);
    } catch { setError('This purchase could not be applied. Please retry or contact support.'); }
    finally { setBusy(false); }
  };
  if (reauth) return <Button variant="outline" onClick={() => void startRocketLogin('/my-products')}>Reconnect Rocket to check purchases</Button>;
  if (!purchases.length) return error ? <p role="alert" className="text-sm text-muted-foreground">{error}</p> : null;
  return <section className="rounded-lg border p-4 space-y-3">
    <h2 className="font-semibold">Apply your Rocket Pro purchase</h2>
    <p className="text-sm text-muted-foreground">Choose a draft, then finish reviewing its launch date.</p>
    <select aria-label="Draft for Rocket Pro purchase" value={productId} onChange={event => setProductId(event.target.value)} className="rounded-md border bg-background p-2">
      <option value="">Choose a draft</option>
      {drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.name}</option>)}
    </select>
    <Button disabled={!productId || busy} onClick={() => void claim()}>{busy ? 'Applying purchase…' : 'Apply Pro purchase'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
