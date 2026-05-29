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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session as any));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s as any));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-fulfill pending reservation after auth
  useEffect(() => {
    if (session && pendingReserve) {
      void doReserve(pendingReserve);
      setPendingReserve(null);
      setAuthOpen(false);
    }
  }, [session, pendingReserve]); // eslint-disable-line

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

  const doReserve = async (value: string) => {
    if (!session) {
      setPendingReserve(value);
      setAuthMode('signup');
      setAuthOpen(true);
      return;
    }

    // Check if user already has a reservation
    const { data: existing } = await (db.from('reservations') as any)
      .select('id')
      .eq('user_id', session.user.id)
      .eq('type', 'founder_handle')
      .maybeSingle();

    if (existing) {
      toast.error('You already have a reserved founder handle.');
      return;
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
      return;
    }
    void (db.from('reserve_events') as any).insert({
      user_id: session.user.id,
      type: 'founder_handle',
      value,
    });
    toast.success(`@${value} is yours.`);
    setAvailability({ state: 'taken', value, reason: 'reservation' });
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
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
        });
        if (error) throw error;
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

          <div className="top-foot">
            {session ? (
              <button className="text-link" onClick={() => supabase.auth.signOut()}>
                Sign out
              </button>
            ) : (
              <button
                className="text-link"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthOpen(true);
                }}
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </section>

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
    .reserve-logo { display: inline-block; margin-bottom: 36px; }
    .reserve-logo img {
      height: 48px; display: block;
      filter: drop-shadow(0 0 18px rgba(255,255,255,0.25));
    }
    @media (min-width: 768px) {
      .reserve-logo img { height: 56px; }
    }
    .display {
      font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
      font-weight: 500; font-size: clamp(40px, 6vw, 72px); line-height: 1.02;
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

    .top-foot { margin-top: 24px; }
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

    @media (prefers-reduced-motion: reduce) {
      .nebula, .grid-floor { animation: none !important; }
    }
  `}</style>
);

export default Reserve;
