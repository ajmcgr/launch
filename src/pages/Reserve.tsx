import { useEffect, useMemo, useRef, useState } from 'react';
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

interface ProductIcon {
  id: string;
  name: string;
  slug: string;
  icon_url: string;
}

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
  const [icons, setIcons] = useState<ProductIcon[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session as any));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s as any));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Pull latest launch icons
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('product_media')
        .select('product_id, url, products!inner(id, name, slug, status, created_at)')
        .eq('type', 'icon')
        .eq('products.status', 'launched')
        .not('url', 'is', null)
        .order('created_at', { ascending: false, referencedTable: 'products' })
        .limit(400);
      const seen = new Set<string>();
      const list: ProductIcon[] = [];
      for (const item of (data || []) as any[]) {
        if (seen.has(item.product_id)) continue;
        seen.add(item.product_id);
        list.push({
          id: item.products.id,
          name: item.products.name,
          slug: item.products.slug,
          icon_url: item.url,
        });
      }
      setIcons(list.slice(0, 200));
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
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="aurora aurora-c" />
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

        <section className="bottom" aria-label="Latest launches">
          {icons.length > 0 && (
            <>
              <IconRow icons={icons} speed={80} />
              <IconRow icons={[...icons].reverse()} speed={110} reverse />
              <IconRow icons={icons.slice(20).concat(icons.slice(0, 20))} speed={95} />
            </>
          )}
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

const IconRow = ({
  icons,
  speed,
  reverse,
}: {
  icons: ProductIcon[];
  speed: number;
  reverse?: boolean;
}) => {
  const doubled = useMemo(() => [...icons, ...icons], [icons]);
  return (
    <div className="icon-row">
      <div
        className={`icon-track ${reverse ? 'rev' : ''}`}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            to={`/launch/${p.slug}`}
            className="icon-tile"
            title={p.name}
          >
            <img src={p.icon_url} alt={p.name} loading="lazy" />
          </Link>
        ))}
      </div>
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
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5;
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

    /* Two-column shell */
    .reserve-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1fr;
      max-width: 1400px;
      margin: 0 auto;
    }
    @media (min-width: 900px) {
      .reserve-shell {
        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
        height: 100vh;
        min-height: 0;
        overflow: hidden;
      }
    }


    /* LEFT */
    .left {
      display: flex; flex-direction: column; justify-content: center;
      padding: 48px 28px 60px;
      max-width: 620px; width: 100%;
      margin: 0 auto;
    }
    @media (min-width: 900px) {
      .left { padding: 60px 56px; margin: 0; height: 100vh; min-height: 0; overflow-y: auto; }
    }

    .reserve-logo { display: inline-block; margin-bottom: 48px; }
    .reserve-logo img {
      height: 44px; display: block;
      filter: drop-shadow(0 0 18px rgba(255,255,255,0.25));
    }
    @media (min-width: 900px) {
      .reserve-logo img { height: 52px; }
    }
    .display {
      font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
      font-weight: 500; font-size: clamp(40px, 5.4vw, 68px); line-height: 1.02;
      letter-spacing: -0.02em; margin: 0 0 18px;
    }
    .grad {
      background: linear-gradient(135deg, #fff 0%, #c7d2fe 40%, #a5b4fc 70%, #f0abfc 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 0 30px rgba(165,180,252,0.25));
    }
    .sub {
      font-size: clamp(15px, 1.2vw, 17px); color: var(--ink); opacity: 0.78;
      margin: 0 0 32px; max-width: 480px;
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

    .checker { padding: 10px; position: relative; max-width: 540px; }
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

    .left-foot { margin-top: 28px; }
    .text-link {
      background: transparent; border: 0; color: var(--ink-dim);
      font-size: 13px; cursor: pointer; padding: 0;
      font-family: inherit;
    }
    .text-link:hover { color: var(--ink); }

    /* RIGHT — icon columns */
    .right {
      position: relative;
      display: none;
      overflow: hidden;
      padding: 0 24px;
      gap: 18px;
      align-items: stretch;
      height: 100vh;
      min-height: 0;
      min-width: 0;
    }
    @media (min-width: 900px) {
      .right { display: flex; }
    }
    .right-fade {
      position: absolute; inset: 0; pointer-events: none; z-index: 2;
      background:
        linear-gradient(180deg, var(--bg) 0%, transparent 18%, transparent 82%, var(--bg) 100%);
    }
    .icon-col {
      flex: 1; overflow: hidden; position: relative;
      min-width: 0; min-height: 0; height: 100%;

      mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
      -webkit-mask-image: linear-gradient(180deg, transparent, black 12%, black 88%, transparent);
    }
    .icon-track {
      display: flex; flex-direction: column; gap: 16px;
      animation: scroll-y 60s linear infinite;
      padding: 16px 0;
      will-change: transform;
    }
    .icon-track.rev { animation-direction: reverse; }
    @keyframes scroll-y {
      from { transform: translateY(0); }
      to { transform: translateY(-50%); }
    }
    .icon-tile {
      display: block;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 18px;
      overflow: hidden;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--line);
      box-shadow: 0 8px 24px -10px rgba(0,0,0,0.6);
      transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
    }
    .icon-tile:hover {
      transform: scale(1.06);
      border-color: rgba(199,210,254,0.5);
      box-shadow: 0 14px 34px -10px rgba(165,180,252,0.35);
    }
    .icon-tile img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }

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
      .aurora, .icon-track { animation: none !important; }
    }
  `}</style>
);

export default Reserve;
