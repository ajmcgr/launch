import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { readSession, rocketRequest } from '@/lib/rocketAcceptance';

// This is an additional channel into the existing Pro order/Submit flow.
// A success URL and a Rocket identity alone never create a paid order.
export default function RocketProClaim({ onFulfilled }: { onFulfilled?: () => void }) {
  const [purchases, setPurchases] = useState<{ purchase_id: string }[]>([]);
  const [drafts, setDrafts] = useState<{ id: string; name: string }[]>([]);
  const [productId, setProductId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [fulfilled, setFulfilled] = useState('');
  async function check() {
    setBusy(true);
    try {
      const status = await rocketRequest('status', {}, true);
      setPurchases(status.purchases.filter((p: { purchase_id: string }) => !status.fulfilments.some((f: { purchase_id: string }) => f.purchase_id === p.purchase_id)));
      if (status.fulfilments.length === 1) setFulfilled(status.fulfilments[0].product_id);
      setMessage(status.configured ? (status.purchases.length ? 'Verified Launch Pro purchase available.' : 'No verified Launch Pro purchase yet.') : 'Launch Pro registration is not complete. No Pro access has been granted.');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase.from('products').select('id,name').eq('owner_id', session.user.id).eq('status', 'draft');
        if (error) throw error;
        setDrafts(data || []);
      }
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (readSession()) void check(); }, []);
  if (!readSession()) return null;
  async function link() {
    setBusy(true);
    try { await rocketRequest('link', { confirm: true }, true); setMessage('Rocket identity linked to your verified Launch account. This grants no Pro purchase.'); }
    catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function fulfil(purchaseId: string) {
    setBusy(true);
    try {
      await rocketRequest('fulfil', { purchase_id: purchaseId, product_id: productId }, true);
      setFulfilled(productId); setPurchases(items => items.filter(p => p.purchase_id !== purchaseId));
      setMessage('One Pro order saved. Complete your launch using the existing submission flow.'); onFulfilled?.();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <section className="rounded-lg border p-5 space-y-3" aria-label="Rocket Launch Pro purchase">
    <h2 className="font-semibold">Launch Pro · $39 USD one-time</h2>
    <p>Sign in to your existing <Link to="/auth" className="underline">Launch account</Link>, then explicitly link your Rocket identity. No email matching or changes to your existing billing.</p>
    <div className="flex gap-3"><button disabled={busy} onClick={link} className="border rounded px-3 py-2">Link Rocket to this Launch account</button><button disabled={busy} onClick={check} className="border rounded px-3 py-2">Check verified purchases</button></div>
    {message && <p role="status">{message}</p>}
    {!!purchases.length && <><label className="block">Use one Pro purchase for an owned draft<select className="block border rounded p-2 w-full" value={productId} onChange={e => setProductId(e.target.value)}><option value="">Choose a draft</option>{drafts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>{purchases.map(p => <button className="border rounded px-3 py-2" key={p.purchase_id} disabled={busy || !productId} onClick={() => fulfil(p.purchase_id)}>Apply verified Pro purchase {p.purchase_id.slice(0, 8)}</button>)}</>}
    {fulfilled && <Link className="underline" to={`/submit?productId=${fulfilled}`}>Complete your Pro launch</Link>}
  </section>;
}
