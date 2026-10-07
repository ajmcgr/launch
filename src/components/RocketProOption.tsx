import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rocketRequest } from '@/lib/rocketAcceptance';
import RocketButton from '@/components/RocketButton';
export default function RocketProOption() {
  const [available, setAvailable] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { void rocketRequest('offer').then(data => setAvailable(data.available === true)).catch(() => setAvailable(false)); }, []);
  // The server catalog includes the existing public checkout gate. Hidden while closed.
  return available ? <div className="pt-3"><RocketButton action="buy" variant="primary" onActivate={() => navigate('/rocket/acceptance')} /></div> : null;
}
