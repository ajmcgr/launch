import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RocketButton from './RocketButton';

export default function RocketProOption({ onActivate }: { onActivate?: () => Promise<void> } = {}) {
  const navigate = useNavigate();
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-rocket-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'buy_availability' }),
    }).then(async response => response.ok ? response.json() : { available: false })
      .then(data => { if (active) setAvailable(data.available === true); })
      .catch(() => { if (active) setAvailable(false); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);
  const activate = async () => {
    if (!available || loading) return;
    if (!onActivate) { navigate('/submit?payment=rocket'); return; }
    setLoading(true);
    setError('');
    try { await onActivate(); }
    catch { setError('Rocket checkout could not open. Please try again.'); }
    finally { setLoading(false); }
  };
  return <div className="space-y-2">
    <RocketButton action="buy" variant="light" disabled={!available || loading} loading={checking || loading} onActivate={() => void activate()} />
    {!checking && !available && <p className="text-xs text-muted-foreground">Rocket purchases are currently unavailable.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
