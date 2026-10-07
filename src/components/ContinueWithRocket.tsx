import { useEffect, useState } from 'react';
import RocketButton from '@/components/RocketButton';
import { startRocketLogin } from '@/lib/rocketAcceptance';

type Props = { returnPath?: string };

export default function ContinueWithRocket({ returnPath }: Props) {
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-rocket-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'availability' }),
    }).then((response) => response.ok ? response.json() : { available: false })
      .then((data) => { if (mounted) setAvailable(data.available === true); })
      .catch(() => { if (mounted) setAvailable(false); });
    return () => { mounted = false; };
  }, []);

  const continueWithRocket = async () => {
    if (loading || !available) return;
    setLoading(true);
    setError('');
    try { await startRocketLogin(returnPath); }
    catch { setError('Rocket sign-in could not open. Please try again.'); setLoading(false); }
  };

  return <div className="flex flex-col gap-2">
    <RocketButton action="continue" variant="primary" className="launch-auth-rocket-button" loading={loading} disabled={loading || !available} onActivate={continueWithRocket} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
