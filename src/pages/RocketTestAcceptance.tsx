import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import RocketButton from '@/components/RocketButton';
import { supabase } from '@/integrations/supabase/client';
import {
  buyRocketTest, completeRocketTest, fulfilRocketTest, rocketTestStatus, startRocketTest,
  type RocketTestStatus,
} from '@/lib/rocketTestAcceptance';

const CALLBACK_QUERY_KEY = 'launch:rocket:test:callback';

export default function RocketTestAcceptance() {
  const location = useLocation();
  const navigate = useNavigate();
  const started = useRef(false);
  const [status, setStatus] = useState<RocketTestStatus | null>(null);
  const [drafts, setDrafts] = useState<Array<{ id: string; name: string }>>([]);
  const [productId, setProductId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth', { replace: true }); return; }
    const { data, error } = await supabase.from('products').select('id,name')
      .eq('owner_id', user.id).eq('status', 'draft').order('created_at', { ascending: false });
    if (error) throw error;
    setDrafts(data || []);
    const saved = localStorage.getItem('launch:rocket:test:pending-purchase');
    setProductId(current => current || (data || []).find(item => item.id === saved)?.id || data?.[0]?.id || '');
    const nextStatus = await rocketTestStatus();
    if (nextStatus.purchases.length) localStorage.removeItem('launch:rocket:test:pending-purchase');
    setStatus(nextStatus);
  }, [navigate]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    setBusy(true);
    void (async () => {
      if (location.pathname === '/rocket/test/callback') {
        let query = location.search;
        try {
          query = sessionStorage.getItem(CALLBACK_QUERY_KEY) || query;
          sessionStorage.removeItem(CALLBACK_QUERY_KEY);
        } catch { /* use router query */ }
        window.history.replaceState(null, '', '/rocket/test/callback');
        await completeRocketTest(query);
        navigate('/rocket/test', { replace: true });
      }
      await refresh();
    })().catch((error: Error) => setMessage(error.message)).finally(() => setBusy(false));
  }, [location.pathname, location.search, navigate, refresh]);

  const run = (action: () => Promise<unknown>) => {
    setMessage(''); setBusy(true);
    void action().catch((error: Error) => setMessage(error.message)).finally(() => setBusy(false));
  };
  const applied = new Set(status?.fulfilments.map(item => item.purchase_id) || []);

  return <main className="mx-auto max-w-2xl px-6 py-16 space-y-6">
    <Helmet><title>Rocket TEST acceptance · Launch</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <h1 className="text-3xl font-bold">Launch Pro test acceptance</h1>
    <p className="text-muted-foreground">Controlled Stripe TEST checkout only. No live charge or Launch paid access is created here.</p>
    {message && <p role="alert" className="rounded border border-destructive px-4 py-3 text-destructive">{message}</p>}
    {busy && <p role="status">Checking the Rocket test connection…</p>}
    {!busy && status && <div className="space-y-5">
      {!status.connected ? <RocketButton action="continue" variant="primary" disabled={busy} onActivate={() => run(startRocketTest)} /> : <>
        <p>Rocket test identity connected.</p>
        <label className="block space-y-2"><span>Unpaid Launch draft</span>
          <select className="block w-full rounded-md border bg-background p-2" value={productId} onChange={event => setProductId(event.target.value)}>
            {drafts.map(draft => <option key={draft.id} value={draft.id}>{draft.name}</option>)}
          </select>
        </label>
        <RocketButton action="buy" variant="primary" disabled={!productId || !status.buy_available || busy}
          onActivate={() => run(() => buyRocketTest(productId))} />
        <button className="block text-primary underline" disabled={busy} onClick={() => run(refresh)}>Check verified test purchase</button>
        {status.purchases.map(purchase => <div key={purchase.purchase_id} className="rounded-md border p-4 space-y-2">
          <p>Verified Rocket test purchase: {purchase.purchase_id}</p>
          {applied.has(purchase.purchase_id) ? <p>Test fulfilment recorded once.</p> :
            <button className="text-primary underline" disabled={!productId || busy}
              onClick={() => run(async () => { await fulfilRocketTest(productId, purchase.purchase_id); await refresh(); })}>
              Record test fulfilment
            </button>}
        </div>)}
      </>}
    </div>}
    <Link to="/my-products" className="text-primary underline">My products</Link>
  </main>;
}
