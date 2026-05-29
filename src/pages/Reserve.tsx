import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Sparkles, Rocket, ShieldCheck, ArrowRight, Check, X, Loader2 } from 'lucide-react';

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

  const [stats, setStats] = useState({ products: 0, founders: 0, votes: 0, reservations: 0 });
  const [founders, setFounders] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session as any));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s as any));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Stats + founder wall
  useEffect(() => {
    (async () => {
      const [products, users, votes, reservations, recent] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('votes').select('*', { count: 'exact', head: true }),
        (db.from('reservations') as any).select('*', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('username')
          .not('username', 'is', null)
          .order('created_at', { ascending: false })
          .limit(80),
      ]);
      setStats({
        products: products.count ?? 0,
        founders: users.count ?? 0,
        votes: votes.count ?? 0,
        reservations: reservations.count ?? 0,
      });
      const list = ((recent.data ?? []) as { username: string }[])
        .map((u) => u.username)
        .filter(Boolean);
      setFounders(list);
    })();
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

  return (
    <div className="reserve-root">
      <Helmet>
        <title>Vibe Code Your Future | Launch</title>
        <meta
          name="description"
          content="Reserve your founder handle and product name on Launch. Build your profile, launch products, and join the next generation of founders building the future."
        />
        <link rel="canonical" href="https://trylaunch.ai/reserve" />
        <meta property="og:title" content="Vibe Code Your Future | Launch" />
        <meta
          property="og:description"
          content="Reserve your founder handle on Launch. Build the future."
        />
        <meta property="og:url" content="https://trylaunch.ai/reserve" />
        <meta property="og:type" content="website" />
      </Helmet>

      <ReserveStyles />

      <div className="reserve-bg" aria-hidden>
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="aurora aurora-c" />
        <div className="grid-floor" />
        <Stars />
      </div>

      {/* Minimal top bar — only the logo */}
      <header className="reserve-nav">
        <Link to="/reserve" className="reserve-logo">
          <img src="/media-kit/launch-logo-white.svg" alt="Launch" />
        </Link>
        <div className="reserve-nav-right">
          {session ? (
            <button className="ghost-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
          ) : (
            <button className="ghost-btn" onClick={() => { setAuthMode('signin'); setAuthOpen(true); }}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="eyebrow">
          <span className="dot" /> Launch · Reserve
        </div>
        <h1 className="display">
          Vibe Code <span className="grad">Your Future</span>
        </h1>
        <p className="sub">
          Reserve your founder handle.<br className="md-hide" />
          {' '}Launch products. Build your future.
        </p>
        <p className="support">
          The next generation of founders is already building on Launch.
          Reserve your place before someone else does.
        </p>

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
              placeholder="alex, levelsio, cursor, shipper"
              className="checker-input"
              spellCheck={false}
              aria-label="Founder handle"
            />
            <button className="primary-btn" disabled={availability.state === 'checking'} onClick={() => check()}>
              {availability.state === 'checking' ? <Loader2 className="spin" size={16} /> : null}
              Check Availability
              <ArrowRight size={16} />
            </button>
          </div>

          {availability.state === 'available' && (
            <div className="result available">
              <div className="result-head">
                <Check size={18} /> Available
              </div>
              <p>
                <strong>@{availability.value}</strong> is available on Launch.
              </p>
              <div className="result-actions">
                <button className="primary-btn" disabled={reserving} onClick={() => doReserve(availability.value)}>
                  {reserving ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                  Reserve @{availability.value}
                </button>
                {!session && (
                  <button
                    className="ghost-btn"
                    onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
                  >
                    Create Free Account
                  </button>
                )}
              </div>
            </div>
          )}

          {availability.state === 'taken' && (
            <div className="result taken">
              <div className="result-head">
                <X size={18} /> Already Reserved
              </div>
              <p>
                <strong>@{availability.value}</strong> has already been reserved.
              </p>
              <div className="result-actions">
                {availability.reason === 'user' && (
                  <button className="primary-btn" onClick={() => navigate(`/${availability.value}`)}>
                    View Profile
                  </button>
                )}
                <button className="ghost-btn" onClick={() => { setInput(''); setAvailability({ state: 'idle' }); }}>
                  Search Again
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <BenefitCard
          icon={<ShieldCheck size={20} />}
          title="Reserve Your Identity"
          body="Secure your founder profile before someone else does."
        />
        <BenefitCard
          icon={<Rocket size={20} />}
          title="Launch Products"
          body="Showcase your products to founders, builders, and early adopters."
        />
        <BenefitCard
          icon={<Sparkles size={20} />}
          title="Build Your Reputation"
          body="Create a public founder profile that grows with every launch."
        />
      </section>

      {/* Live stats */}
      <section className="stats">
        <Stat label="Products Launched" value={stats.products} />
        <Stat label="Founders" value={stats.founders} />
        <Stat label="Votes Cast" value={stats.votes} />
        <Stat label="Reservations" value={stats.reservations} />
      </section>

      {/* Founder wall */}
      {founders.length > 0 && (
        <section className="wall" aria-label="Founders on Launch">
          <div className="wall-label">Builders already on Launch</div>
          <FounderMarquee handles={founders} />
          <FounderMarquee handles={[...founders].reverse()} reverse />
        </section>
      )}

      {/* Final CTA */}
      <section className="final">
        <h2 className="display">
          The future belongs to <span className="grad">builders</span>.
        </h2>
        <p className="sub">Reserve your founder handle today.</p>
        <div className="final-actions">
          <button
            className="primary-btn lg"
            onClick={() => {
              document.querySelector('.checker-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              setTimeout(() => (document.querySelector('.checker-input') as HTMLInputElement)?.focus(), 400);
            }}
          >
            <Sparkles size={16} /> Reserve Your Handle
          </button>
          {!session && (
            <button className="ghost-btn lg" onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}>
              Create Free Account
            </button>
          )}
        </div>
      </section>

      <footer className="reserve-foot">
        <span>© Launch — built for founders.</span>
      </footer>

      {/* Auth modal */}
      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <form className="modal glass" onClick={(e) => e.stopPropagation()} onSubmit={handleAuth}>
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
              {authMode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const BenefitCard = ({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) => (
  <div className="benefit glass">
    <div className="benefit-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{body}</p>
  </div>
);

const Stat = ({ label, value }: { label: string; value: number }) => {
  const display = useCountUp(value);
  return (
    <div className="stat">
      <div className="stat-value">{display.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

const useCountUp = (target: number, duration = 1400) => {
  const [v, setV] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const step = (t: number) => {
      if (start.current == null) start.current = t;
      const p = Math.min(1, (t - start.current) / duration);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    start.current = null;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
};

const FounderMarquee = ({ handles, reverse }: { handles: string[]; reverse?: boolean }) => {
  const doubled = useMemo(() => [...handles, ...handles], [handles]);
  return (
    <div className={`marquee ${reverse ? 'rev' : ''}`}>
      <div className="marquee-track">
        {doubled.map((h, i) => (
          <span key={`${h}-${i}`} className="chip">@{h}</span>
        ))}
      </div>
    </div>
  );
};

const Stars = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.6 + 0.4,
        d: Math.random() * 4 + 2,
      })),
    [],
  );
  return (
    <div className="stars">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            animationDuration: `${s.d}s`,
            animationDelay: `${(i % 7) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
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
      --accent: #cbd5ff;
      --halo: 99,102,241;
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
      background:
        radial-gradient(ellipse 80% 50% at 50% -10%, rgba(120,140,255,0.18), transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(180,120,255,0.12), transparent 60%),
        var(--bg);
    }
    .aurora {
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
      mix-blend-mode: screen; animation: drift 22s ease-in-out infinite alternate;
    }
    .aurora-a { width: 720px; height: 720px; left: -10%; top: -20%;
      background: radial-gradient(circle, rgba(120,140,255,0.65), transparent 60%); }
    .aurora-b { width: 640px; height: 640px; right: -10%; top: 20%;
      background: radial-gradient(circle, rgba(180,120,255,0.55), transparent 60%); animation-delay: -8s; }
    .aurora-c { width: 800px; height: 800px; left: 30%; top: 60%;
      background: radial-gradient(circle, rgba(80,200,255,0.35), transparent 60%); animation-delay: -14s; }
    @keyframes drift {
      0% { transform: translate3d(0,0,0) scale(1); }
      100% { transform: translate3d(40px,-30px,0) scale(1.08); }
    }
    .grid-floor {
      position: absolute; left: 50%; bottom: -10%; transform: translateX(-50%) perspective(800px) rotateX(70deg);
      width: 200%; height: 60%;
      background:
        linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/60px 60px,
        linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px) 0 0/60px 60px;
      mask-image: radial-gradient(ellipse at center top, black 30%, transparent 70%);
    }
    .stars { position: absolute; inset: 0; }
    .stars span {
      position: absolute; background: white; border-radius: 50%;
      box-shadow: 0 0 6px rgba(255,255,255,0.6);
      animation: twinkle 3s ease-in-out infinite alternate;
      opacity: 0.6;
    }
    @keyframes twinkle { from { opacity: 0.2; } to { opacity: 0.9; } }

    /* Nav */
    .reserve-nav {
      display: flex; justify-content: space-between; align-items: center;
      max-width: 1240px; margin: 0 auto; padding: 24px 24px;
    }
    .reserve-logo img { height: 22px; display: block; filter: drop-shadow(0 0 12px rgba(255,255,255,0.25)); }
    .ghost-btn {
      background: transparent; color: var(--ink); border: 1px solid var(--line-strong);
      padding: 8px 14px; border-radius: 999px; font-size: 13px; cursor: pointer;
      transition: background .2s, border-color .2s, transform .2s;
    }
    .ghost-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); }
    .ghost-btn.lg { padding: 14px 22px; font-size: 14px; }

    /* Hero */
    .hero { max-width: 1040px; margin: 0 auto; padding: 60px 24px 80px; text-align: center; }
    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--ink-dim); padding: 6px 14px; border: 1px solid var(--line);
      border-radius: 999px; background: rgba(255,255,255,0.02); backdrop-filter: blur(8px);
    }
    .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: #7dd3fc; box-shadow: 0 0 10px #7dd3fc; }
    .display {
      font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
      font-weight: 500; font-size: clamp(44px, 7vw, 88px); line-height: 1.02;
      letter-spacing: -0.02em; margin: 24px 0 18px;
    }
    .grad {
      background: linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #a5b4fc 70%, #f0abfc 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 0 30px rgba(165,180,252,0.25));
    }
    .sub { font-size: clamp(16px, 1.4vw, 19px); color: var(--ink); opacity: 0.85; max-width: 620px; margin: 0 auto; }
    .support { font-size: 14px; color: var(--ink-dim); max-width: 560px; margin: 14px auto 36px; }
    .md-hide { display: none; }
    @media (min-width: 640px) { .md-hide { display: inline; } }

    /* Glass */
    .glass {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid var(--line-strong);
      border-radius: 20px;
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.08) inset,
        0 30px 80px -20px rgba(0,0,0,0.6),
        0 0 0 1px rgba(255,255,255,0.02);
    }

    .checker { max-width: 640px; margin: 0 auto; padding: 10px; position: relative; }
    .checker::before {
      content: ''; position: absolute; inset: -1px; border-radius: 21px;
      background: linear-gradient(135deg, rgba(165,180,252,0.4), rgba(240,171,252,0.2), transparent 60%);
      z-index: -1; filter: blur(20px); opacity: 0.6;
    }
    .checker-inner {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 6px 6px 18px; border-radius: 14px;
      background: rgba(10,12,20,0.6); border: 1px solid var(--line);
    }
    .at { color: var(--ink-dim); font-size: 18px; }
    .checker-input {
      flex: 1; background: transparent; border: 0; outline: 0; color: var(--ink);
      font-size: 18px; padding: 14px 4px; min-width: 0;
    }
    .checker-input::placeholder { color: rgba(154,160,180,0.55); }

    .primary-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(180deg, #ffffff, #d8def0);
      color: #0a0b12; border: 0; padding: 12px 18px; border-radius: 10px;
      font-weight: 600; font-size: 14px; cursor: pointer;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.4) inset, 0 12px 30px -10px rgba(255,255,255,0.35);
      transition: transform .15s ease, box-shadow .2s ease;
    }
    .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.6) inset, 0 18px 40px -10px rgba(255,255,255,0.45); }
    .primary-btn:disabled { opacity: 0.7; cursor: progress; }
    .primary-btn.lg { padding: 14px 22px; font-size: 15px; }
    .primary-btn.full { width: 100%; justify-content: center; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .result { padding: 18px 20px 6px; text-align: left; }
    .result-head { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px;
      padding: 4px 10px; border-radius: 999px; margin-bottom: 10px;
    }
    .available .result-head { background: rgba(74,222,128,0.12); color: #86efac; border: 1px solid rgba(74,222,128,0.3); }
    .taken .result-head { background: rgba(248,113,113,0.12); color: #fca5a5; border: 1px solid rgba(248,113,113,0.3); }
    .result p { color: var(--ink-dim); margin: 0 0 14px; font-size: 14px; }
    .result p strong { color: var(--ink); }
    .result-actions { display: flex; flex-wrap: wrap; gap: 10px; padding-bottom: 10px; }

    /* Benefits */
    .benefits {
      max-width: 1100px; margin: 60px auto; padding: 0 24px;
      display: grid; gap: 20px; grid-template-columns: 1fr;
    }
    @media (min-width: 768px) { .benefits { grid-template-columns: repeat(3, 1fr); } }
    .benefit { padding: 28px; }
    .benefit-icon {
      display: inline-flex; padding: 10px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(165,180,252,0.2), rgba(240,171,252,0.1));
      border: 1px solid rgba(255,255,255,0.1); color: #c7d2fe; margin-bottom: 16px;
    }
    .benefit h3 { font-size: 18px; margin: 0 0 8px; font-weight: 600; letter-spacing: -0.01em; }
    .benefit p { color: var(--ink-dim); font-size: 14px; line-height: 1.55; margin: 0; }

    /* Stats */
    .stats {
      max-width: 1100px; margin: 80px auto; padding: 0 24px;
      display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; text-align: center;
    }
    @media (min-width: 768px) { .stats { grid-template-columns: repeat(4,1fr); } }
    .stat-value {
      font-family: 'Reckless', Georgia, serif; font-size: clamp(36px, 5vw, 56px);
      background: linear-gradient(180deg, #fff, #94a3b8);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      letter-spacing: -0.02em;
    }
    .stat-label { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); margin-top: 6px; }

    /* Marquee */
    .wall { padding: 40px 0 60px; }
    .wall-label {
      text-align: center; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--ink-dim); margin-bottom: 20px;
    }
    .marquee { overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); padding: 8px 0; }
    .marquee-track { display: inline-flex; gap: 14px; animation: scroll 50s linear infinite; white-space: nowrap; }
    .marquee.rev .marquee-track { animation-direction: reverse; animation-duration: 65s; }
    .chip {
      display: inline-flex; align-items: center; padding: 10px 18px; border-radius: 999px;
      background: rgba(255,255,255,0.04); border: 1px solid var(--line);
      color: var(--ink); font-size: 14px; backdrop-filter: blur(8px);
    }
    @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

    /* Final */
    .final { max-width: 880px; margin: 100px auto 60px; padding: 0 24px; text-align: center; }
    .final-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 28px; }

    /* Footer */
    .reserve-foot { text-align: center; padding: 40px 24px 60px; color: var(--ink-dim); font-size: 12px; border-top: 1px solid var(--line); margin-top: 40px; }

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
      outline: none; transition: border-color .2s;
    }
    .modal-input:focus { border-color: rgba(199,210,254,0.5); }
    .text-toggle {
      width: 100%; background: transparent; border: 0; color: var(--ink-dim); font-size: 13px;
      margin-top: 14px; cursor: pointer; padding: 6px;
    }
    .text-toggle:hover { color: var(--ink); }

    @media (prefers-reduced-motion: reduce) {
      .aurora, .stars span, .marquee-track { animation: none !important; }
    }
  `}</style>
);

export default Reserve;
