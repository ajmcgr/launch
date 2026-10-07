import { useState } from 'react';
import RocketButton from '@/components/RocketButton';
import { startRocketLogin } from '@/lib/rocketAcceptance';

export default function ContinueWithRocket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const continueWithRocket = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      await startRocketLogin();
    } catch {
      setError('Rocket sign-in could not open. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <RocketButton action="continue" variant="light" loading={loading} disabled={loading} onActivate={continueWithRocket} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
