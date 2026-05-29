import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Sparkles, ArrowRight, Check, X, Loader2 } from 'lucide-react';

// Loose typed client — tables created via migration but not yet in generated types
const db = supabase as unknown as {
  from: (t: string) => ReturnType<typeof supabase.from>;
} & typeof supabase;

const handleSchema = z
  .string()
  .trim()
  .min(2, 'Too short')
  .max(30, 'Too long')
  .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only');

type Availability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; value: string }
  | { state: 'taken'; value: string; reason: 'user' | 'reservation' };

const sanitize = (raw: string) => raw.replace(/^@+/, '').trim();


const Reserve = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' });
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [reserving, setReserving] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingReserve, setPendingReserve] = useState<string | null>(null);
  const [myReservation, setMyReservation] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session as any));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s as any));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load this user's existing reservation whenever session changes
  useEffect(() => {
    if (!session) { setMyReservation(null); return; }
    (async () => {
      const { data } = await (db.from('reservations') as any)
        .select('value')
        .eq('user_id', session.user.id)
        .eq('type', 'founder_handle')
        .maybeSingle();
      if (data?.value) setMyReservation(data.value);
    })();
  }, [session]);

  // Auto-fulfill pending reservation after auth (persisted across email-confirm redirect/new tab)
  useEffect(() => {
    if (!session) return;
    const persisted = localStorage.getItem('reserve:pending');
    const value = pendingReserve ?? persisted;
    if (!value) return;
    localStorage.removeItem('reserve:pending');
    setPendingReserve(null);
    setAuthOpen(false);
    (async () => {
      const ok = await doReserve(value, true);
      if (ok) setMyReservation(value);
    })();
  }, [session]); // eslint-disable-line


  const check = async (raw?: string) => {
    const value = sanitize(raw ?? input);
    const parsed = handleSchema.safeParse(value);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setAvailability({ state: 'checking' });

    const [{ data: user }, { data: reservation }] = await Promise.all([
      supabase.from('users').select('username').ilike('username', value).maybeSingle(),
      (db.from('reservations') as any)
        .select('id')
        .eq('type', 'founder_handle')
        .eq('value_lower', value.toLowerCase())
        .maybeSingle(),
    ]);

    const taken = !!user || !!reservation;
    void (db.from('reserve_searches') as any).insert({ search_term: value, found: !taken });

    if (taken) {
      setAvailability({ state: 'taken', value, reason: user ? 'user' : 'reservation' });
    } else {
      setAvailability({ state: 'available', value });
    }
  };

  const doReserve = async (value: string, fromSignup = false): Promise<boolean> => {
    if (session && !fromSignup) {
      toast.error('Reservations are for new makers only. Sign out to reserve a handle.');
      return false;
    }
    if (!session) {
      sessionStorage.setItem('reserve:pending', value);
      setPendingReserve(value);
      setAuthMode('signup');
      setAuthOpen(true);
      return false;
    }

    // Check if user already has a reservation
    const { data: existing } = await (db.from('reservations') as any)
      .select('id, value')
      .eq('user_id', session.user.id)
      .eq('type', 'founder_handle')
      .maybeSingle();

    if (existing) {
      setMyReservation((existing as any).value ?? value);
      toast.error('You already have a reserved founder handle.');
      return false;
    }

    setReserving(true);
    const { error } = await (db.from('reservations') as any).insert({
      user_id: session.user.id,
      type: 'founder_handle',
      value,
      status: 'reserved',
    });
    setReserving(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Just got reserved by someone else.' : error.message);
      void check(value);
      return false;
    }
    void (db.from('reserve_events') as any).insert({
      user_id: session.user.id,
      type: 'founder_handle',
      value,
    });
    toast.success(`@${value} is yours.`);
    setMyReservation(value);
    setAvailability({ state: 'taken', value, reason: 'reservation' });
    return true;
  };


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
          options: { emailRedirectTo: `${window.location.origin}/reserve` },
        });
        if (error) throw error;
        toast.success('Check your inbox to confirm — then your handle is locked in.');
      } else {
        // Existing user signing in — don't auto-reserve
        setPendingReserve(null);
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        });
        if (error) throw error;
        setAuthOpen(false);
      }

    } catch (err: any) {
      toast.error(err.message ?? 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/reserve`,
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message ?? `Failed to continue with ${provider}`);
    }
  };


  return (
    <div className="reserve-root">
      <Helmet>
        <title>Vibe Code Your Future | Launch</title>
        <meta
          name="description"
          content="Reserve your founder handle on Launch. Build your profile, launch products, and join the next generation of founders building the future."
        />
        <link rel="canonical" href="https://trylaunch.ai/reserve" />
        <meta property="og:title" content="Vibe Code Your Future | Launch" />
        <meta property="og:description" content="Reserve your founder handle on Launch. Build the future." />
        <meta property="og:url" content="https://trylaunch.ai/reserve" />
        <meta property="og:type" content="website" />
      </Helmet>

      <ReserveStyles />

      <div className="reserve-bg" aria-hidden>
        <Starfield />
        <div className="nebula nebula-a" />
        <div className="nebula nebula-b" />
        <div className="nebula nebula-c" />
        <div className="grid-floor" />
        <div className="vignette" />
      </div>


      <div className="reserve-shell">
        <section className="top">
          <Link to="/reserve" className="reserve-logo" aria-label="Launch">
            <img src="/media-kit/launch-logo-white.svg" alt="Launch" />
          </Link>

          <h1 className="display">
            Vibe Code <span className="grad">Your Future</span>
          </h1>
          <p className="sub">Reserve your founder handle on Launch.</p>

          <div className="checker glass">
            <div className="checker-inner">
              <span className="at">@</span>
              <input
                autoFocus
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setAvailability({ state: 'idle' });
                }}
                onKeyDown={(e) => e.key === 'Enter' && check()}
                placeholder="your-handle"
                className="checker-input"
                spellCheck={false}
                aria-label="Founder handle"
              />
              <button
                className="primary-btn"
                disabled={availability.state === 'checking'}
                onClick={() => check()}
              >
                {availability.state === 'checking' ? (
                  <Loader2 className="spin" size={16} />
                ) : null}
                Check
                <ArrowRight size={16} />
              </button>
            </div>

            {availability.state === 'available' && (
              <div className="result available">
                <div className="result-head">
                  <Check size={18} /> Available
                </div>
                <p>
                  <strong>@{availability.value}</strong> is available.
                </p>
                <div className="result-actions">
                  <button
                    className="primary-btn"
                    disabled={reserving}
                    onClick={() => doReserve(availability.value)}
                  >
                    {reserving ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                    Reserve @{availability.value}
                  </button>
                </div>
              </div>
            )}

            {availability.state === 'taken' && (
              <div className="result taken">
                <div className="result-head">
                  <X size={18} /> Already Reserved
                </div>
                <p>
                  <strong>@{availability.value}</strong> is taken.
                </p>
                <div className="result-actions">
                  {availability.reason === 'user' && (
                    <button
                      className="primary-btn"
                      onClick={() => navigate(`/${availability.value}`)}
                    >
                      View Profile
                    </button>
                  )}
                  <button
                    className="ghost-btn"
                    onClick={() => {
                      setInput('');
                      setAvailability({ state: 'idle' });
                    }}
                  >
                    Search Again
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="share-row">
            <a href="mailto:?subject=Reserve%20your%20founder%20handle%20on%20Launch&body=Check%20out%20https://trylaunch.ai/reserve%20%E2%80%94%20reserve%20your%20founder%20handle%20on%20Launch." className="share-link">
              Share via email
            </a>
            <span className="share-dot">·</span>
            <a href="https://twitter.com/intent/tweet?text=Reserve%20your%20founder%20handle%20on%20Launch%20%F0%9F%9A%80%20https%3A%2F%2Ftrylaunch.ai%2Freserve" target="_blank" rel="noopener noreferrer" className="share-link">
              Post on X
            </a>
          </div>

          <div className="top-foot" style={{ marginTop: '1.75rem' }}>
            <Link to="/" className="text-link" style={{ fontSize: '1.15rem' }}>
              Take me to Launch →
            </Link>
          </div>
        </section>

        <footer className="reserve-footer">
          <div className="reserve-footer-line">
            <span>&copy; Launch 2026</span>
            <a href="http://trylaunch.ai/contact" target="_blank" rel="noopener noreferrer">Contact</a>
            <a href="https://trylaunch.ai/submit" target="_blank" rel="noopener noreferrer">Submit</a>
            <a href="https://x.com/trylaunchai" target="_blank" rel="noopener noreferrer">X</a>
            <a href="https://instagram.com/trylaunch" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://discord.gg/rjnXdm5zgw" target="_blank" rel="noopener noreferrer">Discord</a>
          </div>
        </footer>
      </div>


      {/* Auth modal */}
      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <form
            className="modal glass"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAuth}
          >
            <h3>{authMode === 'signup' ? 'Create your free account' : 'Welcome back'}</h3>
            <p className="modal-sub">
              {pendingReserve
                ? `Sign in to lock @${pendingReserve}.`
                : 'It takes 10 seconds.'}
            </p>
            <div className="oauth-row">
              <button
                type="button"
                className="oauth-btn"
                onClick={() => handleOAuth('google')}
                disabled={authLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button
                type="button"
                className="oauth-btn"
                onClick={() => handleOAuth('github')}
                disabled={authLoading}
              >
                <svg className="oauth-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Continue with GitHub
              </button>
            </div>
            <div className="oauth-divider"><span>or</span></div>
            <input
              type="email"
              required
              placeholder="you@founder.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="modal-input"
              autoFocus
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Password (min 6)"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="modal-input"
            />
            <button className="primary-btn lg full" disabled={authLoading} type="submit">
              {authLoading && <Loader2 className="spin" size={16} />}
              {authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="text-toggle"
              onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
            >
              {authMode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};



// Animated warp starfield — pure canvas, GPU-free, lightweight
const Starfield = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0, cx = 0, cy = 0;
    let raf = 0;

    type Star = { x: number; y: number; z: number; pz: number; o: number };
    const COUNT = 320;
    const stars: Star[] = [];

    const reset = (s: Star, randomZ = false) => {
      s.x = (Math.random() - 0.5) * w;
      s.y = (Math.random() - 0.5) * h;
      s.z = randomZ ? Math.random() * w : w;
      s.pz = s.z;
      s.o = 0.4 + Math.random() * 0.6;
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      cx = w / 2;
      cy = h / 2;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      if (stars.length === 0) {
        for (let i = 0; i < COUNT; i++) {
          const s: Star = { x: 0, y: 0, z: 0, pz: 0, o: 1 };
          reset(s, true);
          stars.push(s);
        }
      }
    };

    const SPEED = reduced ? 0 : 0.8;

    const tick = () => {
      // Deep space wash with trail
      ctx.fillStyle = 'rgba(5, 6, 10, 0.35)';
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.pz = s.z;
        s.z -= SPEED;
        if (s.z < 1) {
          reset(s);
          continue;
        }

        const k = 128 / s.z;
        const sx = s.x * k + cx;
        const sy = s.y * k + cy;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) {
          reset(s);
          continue;
        }

        const pk = 128 / s.pz;
        const px = s.x * pk + cx;
        const py = s.y * pk + cy;

        const size = Math.max(0.4, (1 - s.z / w) * 2.2);
        const alpha = Math.min(1, (1 - s.z / w) * s.o);

        // Trailing streak
        ctx.strokeStyle = `rgba(200, 215, 255, ${alpha * 0.55})`;
        ctx.lineWidth = size * 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Head
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    if (reduced) {
      // single static frame
      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        const k = 128 / s.z;
        ctx.fillStyle = `rgba(255,255,255,${0.7 * s.o})`;
        ctx.fillRect(s.x * k + cx, s.y * k + cy, 1.4, 1.4);
      }
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="starfield" />;
};



// All styles scoped under .reserve-root — no leakage to the rest of the app.
const ReserveStyles = () => (
  <style>{`
    .reserve-root {
      --bg: #05060a;
      --ink: #f4f5f9;
      --ink-dim: #9aa0b4;
      --line: rgba(255,255,255,0.08);
      --line-strong: rgba(255,255,255,0.16);
      min-height: 100vh;
      background: var(--bg);
      color: var(--ink);
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      position: relative;
      overflow-x: clip;
      isolation: isolate;
      -webkit-font-smoothing: antialiased;
    }
    .reserve-bg {
      position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none;
      background: #03040a;
    }
    .starfield {
      position: absolute; inset: 0; width: 100%; height: 100%; display: block;
    }
    .nebula {
      position: absolute; border-radius: 50%;
      mix-blend-mode: screen; opacity: 0;
      animation: nebula-fade-in 1.4s ease-out forwards, nebula-drift 52s ease-in-out 1.4s infinite alternate;
      transform: translate3d(0,0,0);
      will-change: transform, opacity;
      contain: layout paint size;
    }
    /* Use softer radial gradients instead of expensive CSS blur — same look, far cheaper to paint */
    .nebula-a {
      width: 70vw; height: 70vw; left: -18vw; top: -22vw;
      background: radial-gradient(circle, rgba(96,120,255,0.55) 0%, rgba(96,120,255,0.18) 35%, transparent 70%);
    }
    .nebula-b {
      width: 60vw; height: 60vw; right: -16vw; top: 8vw;
      background: radial-gradient(circle, rgba(200,90,255,0.45) 0%, rgba(200,90,255,0.15) 35%, transparent 70%);
      animation-delay: 0s, -10s; animation-duration: 1.4s, 68s;
    }
    .nebula-c {
      width: 75vw; height: 75vw; left: 18vw; bottom: -30vw;
      background: radial-gradient(circle, rgba(40,200,255,0.35) 0%, rgba(40,200,255,0.12) 35%, transparent 70%);
      animation-delay: 0s, -18s; animation-duration: 1.4s, 80s;
    }
    @media (max-width: 768px) {
      .nebula-a { width: 140vw; height: 140vw; left: -35vw; top: -50vw; }
      .nebula-b { width: 120vw; height: 120vw; right: -45vw; top: 25vh; }
      .nebula-c { width: 140vw; height: 140vw; left: -20vw; bottom: -70vw; }
      .grid-floor { bottom: -20vh; height: 60vh; }
    }
    @keyframes nebula-fade-in {
      to { opacity: 0.65; }
    }
    @keyframes nebula-drift {
      0%   { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
      50%  { transform: translate3d(40px,-30px,0) scale(1.08) rotate(8deg); }
      100% { transform: translate3d(-30px,40px,0) scale(1.04) rotate(-6deg); }
    }
    .grid-floor {
      position: absolute;
      left: 50%; bottom: -32vh;
      width: 220%; height: 80vh;
      transform: translateX(-50%) perspective(800px) rotateX(72deg);
      transform-origin: 50% 0%;
      background:
        linear-gradient(to right, rgba(160,180,255,0.18) 1px, transparent 1px) 0 0 / 64px 64px,
        linear-gradient(to bottom, rgba(160,180,255,0.18) 1px, transparent 1px) 0 0 / 64px 64px;
      mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%);
      -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 0%, transparent 75%);
      animation: grid-march 36s linear infinite;
      opacity: 0.65;
    }
    @keyframes grid-march {
      from { background-position: 0 0, 0 0; }
      to   { background-position: 0 64px, 0 64px; }
    }
    .vignette {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 90% 70% at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%),
        linear-gradient(180deg, rgba(3,4,10,0) 60%, rgba(3,4,10,0.9) 100%);
    }


    /* Single-column shell */
    .reserve-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* TOP — hero */
    .top {
      flex: 1;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      text-align: center;
      padding: 64px 24px 40px;
      max-width: 720px; width: 100%;
      margin: 0 auto;
    }
    .reserve-logo { display: inline-block; margin-bottom: 32px; }
    .reserve-logo img {
      height: 42px; display: block;
      filter: drop-shadow(0 0 18px rgba(255,255,255,0.25));
    }
    @media (min-width: 768px) {
      .reserve-logo img { height: 48px; }
    }
    .display {
      font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
      font-weight: 500; font-size: clamp(46px, 6.8vw, 78px); line-height: 1.02;
      letter-spacing: -0.02em; margin: 0 0 18px;
    }
    .grad {
      background: linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #a5b4fc 70%, #f0abfc 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 0 30px rgba(165,180,252,0.25));
    }
    .sub {
      font-size: clamp(15px, 1.2vw, 17px); color: var(--ink); opacity: 0.78;
      margin: 0 0 28px; max-width: 480px;
    }

    /* Glass */
    .glass {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid var(--line-strong);
      border-radius: 20px;
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.08) inset,
        0 30px 80px -20px rgba(0,0,0,0.6);
    }

    .checker { padding: 10px; position: relative; width: 100%; max-width: 560px; }
    .checker::before {
      content: ''; position: absolute; inset: -1px; border-radius: 21px;
      background: linear-gradient(135deg, rgba(165,180,252,0.4), rgba(240,171,252,0.2), transparent 60%);
      z-index: -1; filter: blur(20px); opacity: 0.55;
    }
    .checker-inner {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 6px 6px 18px; border-radius: 14px;
      background: rgba(10,12,20,0.6); border: 1px solid var(--line);
    }
    .at { color: var(--ink-dim); font-size: 18px; }
    .checker-input {
      flex: 1; background: transparent; border: 0; outline: 0; color: var(--ink);
      font-size: 17px; padding: 14px 4px; min-width: 0;
      font-family: inherit;
    }
    .checker-input::placeholder { color: rgba(154,160,180,0.55); }

    .primary-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(180deg, #ffffff, #d8def0);
      color: #0a0b12; border: 0; padding: 12px 18px; border-radius: 10px;
      font-weight: 600; font-size: 14px; cursor: pointer;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.4) inset, 0 12px 30px -10px rgba(255,255,255,0.35);
      transition: transform .15s ease, box-shadow .2s ease;
      font-family: inherit;
    }
    .primary-btn:hover { transform: translateY(-1px); }
    .primary-btn:disabled { opacity: 0.7; cursor: progress; }
    .primary-btn.lg { padding: 14px 22px; font-size: 15px; }
    .primary-btn.full { width: 100%; justify-content: center; }
    .ghost-btn {
      background: transparent; color: var(--ink); border: 1px solid var(--line-strong);
      padding: 10px 16px; border-radius: 10px; font-size: 13px; cursor: pointer;
      font-family: inherit;
    }
    .ghost-btn:hover { background: rgba(255,255,255,0.05); }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result { padding: 18px 20px 6px; text-align: left; }
    .result-head {
      display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px;
      padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
    }
    .available .result-head { background: rgba(74,222,128,0.12); color: #86efac; border: 1px solid rgba(74,222,128,0.3); }
    .taken .result-head { background: rgba(248,113,113,0.12); color: #fca5a5; border: 1px solid rgba(248,113,113,0.3); }
    .result p { color: var(--ink-dim); margin: 0 0 14px; font-size: 14px; }
    .result p strong { color: var(--ink); }
    .result-actions { display: flex; flex-wrap: wrap; gap: 10px; padding-bottom: 10px; }

    .share-row {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 14px; font-size: 13px; color: var(--ink-dim);
    }
    .share-link {
      color: var(--ink-dim); text-decoration: none; transition: color .2s;
    }
    .share-link:hover { color: var(--ink); }
    .share-dot { opacity: 0.4; }

    .top-foot { margin-top: 18px; }
    .text-link {
      background: transparent; border: 0; color: var(--ink-dim);
      font-size: 13px; cursor: pointer; padding: 0;
      font-family: inherit;
    }
    .text-link:hover { color: var(--ink); }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(2,3,8,0.7); backdrop-filter: blur(12px);
      display: flex; align-items: center; justify-content: center; z-index: 100; padding: 20px;
      animation: fade 0.2s ease;
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    .modal { width: 100%; max-width: 420px; padding: 32px; }
    .modal h3 { font-family: 'Reckless', Georgia, serif; font-size: 26px; margin: 0 0 6px; letter-spacing: -0.02em; }
    .modal-sub { color: var(--ink-dim); font-size: 14px; margin: 0 0 20px; }
    .modal-input {
      width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--line-strong);
      color: var(--ink); padding: 12px 14px; border-radius: 10px; font-size: 14px; margin-bottom: 10px;
      outline: none; transition: border-color .2s; font-family: inherit;
    }
    .modal-input:focus { border-color: rgba(199,210,254,0.5); }
    .text-toggle {
      width: 100%; background: transparent; border: 0; color: var(--ink-dim); font-size: 13px;
      margin-top: 14px; cursor: pointer; padding: 6px; font-family: inherit;
    }
    .text-toggle:hover { color: var(--ink); }
    .oauth-row { display: grid; gap: 8px; margin-bottom: 14px; }
    .oauth-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 10px;
      width: 100%; padding: 11px 14px; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid var(--line-strong);
      color: var(--ink); font-size: 14px; font-weight: 500; cursor: pointer;
      font-family: inherit; transition: background .2s, border-color .2s;
    }
    .oauth-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.24); }
    .oauth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .oauth-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .oauth-divider {
      display: flex; align-items: center; gap: 10px; color: var(--ink-dim);
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; margin: 4px 0 12px;
    }
    .oauth-divider::before, .oauth-divider::after {
      content: ''; flex: 1; height: 1px; background: var(--line-strong);
    }

    .reserve-footer {
      position: fixed; left: 20px; bottom: 16px; z-index: 10;
    }
    .reserve-footer-line {
      display: flex; flex-wrap: wrap; align-items: center; gap: 20px;
      font-size: 12px; color: var(--ink-dim); opacity: 0.75; line-height: 1.5; margin: 0;
    }
    .reserve-footer-line a {
      color: inherit; text-decoration: none; transition: color .2s;
    }
    .reserve-footer-line a:hover { color: var(--ink); }
    @media (max-width: 768px) {
      .reserve-footer { left: 16px; bottom: 12px; }
      .reserve-footer-line { font-size: 10px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .nebula, .grid-floor { animation: none !important; }
    }
  `}</style>
);

export default Reserve;
