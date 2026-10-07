import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { completeRocketLogin, startRocketLogin } from '@/lib/rocketAcceptance';
import RocketButton from '@/components/RocketButton';

export default function RocketAcceptance() {
  const location = useLocation();
  const navigate = useNavigate();
  const started = useRef(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (started.current || location.pathname !== '/rocket/callback') return;
    started.current = true;
    const query = location.search;
    window.history.replaceState(null, '', '/rocket/callback');
    setBusy(true);
    void completeRocketLogin(query)
      .then((returnPath) => navigate(returnPath, { replace: true }))
      .catch((error: Error) => { setMessage(error.message); setBusy(false); });
  }, [location.pathname, location.search, navigate]);

  return <main className="mx-auto max-w-xl px-6 py-16 space-y-6">
    <Helmet><title>Continue with Rocket · Launch</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <h1 className="text-3xl font-bold">Continue with Rocket</h1>
    <p>Rocket can securely sign you in to Launch. It does not change your existing Launch account or billing.</p>
    {location.pathname === '/rocket/callback' && busy && <p role="status">Finishing your secure sign-in…</p>}
    {message && <><p role="alert">{message}</p><RocketButton action="continue" variant="primary" loading={busy} disabled={busy} onActivate={() => void startRocketLogin('/auth')} /></>}
  </main>;
}
