import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Rocket, Users, Sparkles, TrendingUp, Hammer, Compass, Flame } from 'lucide-react';

// ---------- Animated metallic aurora background ----------
const Aurora = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    // Drifting particle field — soft glowing motes
    const N = 90;
    const motes = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: (Math.random() * 1.6 + 0.4) * dpr,
      vx: (Math.random() - 0.5) * 0.12 * dpr,
      vy: (Math.random() - 0.5) * 0.12 * dpr,
      a: Math.random() * 0.6 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of motes) {
        if (!reduce) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.x < 0 || m.x > canvas.width) m.vx *= -1;
          if (m.y < 0 || m.y > canvas.height) m.vy *= -1;
        }
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 8);
        g.addColorStop(0, `rgba(255, 220, 170, ${m.a})`);
        g.addColorStop(1, 'rgba(255, 220, 170, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="vcyf-bg" aria-hidden>
      <canvas ref={canvasRef} className="vcyf-canvas" />
      <div className="vcyf-aurora vcyf-aurora-a" />
      <div className="vcyf-aurora vcyf-aurora-b" />
      <div className="vcyf-aurora vcyf-aurora-c" />
      <div className="vcyf-grain" />
      <div className="vcyf-vignette" />
    </div>
  );
};

// ---------- Animated counter ----------
const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1600;
            const start = performance.now();
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / duration);
              const eased = 1 - Math.pow(1 - p, 3);
              setN(Math.floor(to * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  const formatted = n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
  return (
    <span ref={ref} className="vcyf-counter">
      {formatted}
      {suffix}
    </span>
  );
};

interface Stats {
  launched: number;
  makers: number;
  votes: number;
  members: number;
}

const VibeCodeYourFuture = () => {
  const [stats, setStats] = useState<Stats>({ launched: 2400, makers: 1800, votes: 38000, members: 5200 });

  useEffect(() => {
    (async () => {
      try {
        const [{ count: launched }, { count: members }, { count: votes }] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'launched'),
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('votes').select('*', { count: 'exact', head: true }),
        ]);
        setStats({
          launched: launched ?? 2400,
          makers: members ?? 1800,
          votes: votes ?? 38000,
          members: members ?? 5200,
        });
      } catch {
        /* fallback values already set */
      }
    })();
  }, []);

  return (
    <div className="vcyf-root">
      <Helmet>
        <title>Vibe Code Your Future</title>
        <meta
          name="description"
          content="Recently laid off? Turn uncertainty into momentum. Reserve your founder handle, launch products, and build your future with Launch."
        />
        <link rel="canonical" href="https://trylaunch.ai/vibecodeyourfuture" />
        <meta property="og:title" content="Vibe Code Your Future" />
        <meta
          property="og:description"
          content="Recently laid off? Turn uncertainty into momentum. Reserve your founder handle and build your next chapter."
        />
      </Helmet>

      <style>{`
        .vcyf-root {
          position: relative;
          min-height: 100vh;
          background: #050407;
          color: #f1ece4;
          font-family: 'Inter', system-ui, sans-serif;
          overflow-x: hidden;
        }
        .vcyf-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .vcyf-canvas { position: absolute; inset: 0; }
        .vcyf-aurora { position: absolute; border-radius: 50%; filter: blur(80px); mix-blend-mode: screen; opacity: 0.55; }
        .vcyf-aurora-a {
          width: 60vw; height: 60vw; left: -10vw; top: -20vw;
          background: radial-gradient(circle, #c9923a 0%, transparent 60%);
          animation: vcyf-drift-a 28s ease-in-out infinite;
        }
        .vcyf-aurora-b {
          width: 55vw; height: 55vw; right: -10vw; top: 20vh;
          background: radial-gradient(circle, #8a5a2b 0%, transparent 60%);
          animation: vcyf-drift-b 36s ease-in-out infinite;
        }
        .vcyf-aurora-c {
          width: 70vw; height: 70vw; left: 10vw; bottom: -30vw;
          background: radial-gradient(circle, #3a2a55 0%, transparent 60%);
          animation: vcyf-drift-c 44s ease-in-out infinite;
        }
        @keyframes vcyf-drift-a { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(8vw,4vw) scale(1.1);} }
        @keyframes vcyf-drift-b { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-6vw,6vw) scale(1.15);} }
        @keyframes vcyf-drift-c { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(4vw,-4vw) scale(1.05);} }
        .vcyf-grain {
          position: absolute; inset: 0; opacity: 0.06; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>");
        }
        .vcyf-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%);
        }
        .vcyf-shell { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 0 24px; }

        .vcyf-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px; border-radius: 999px;
          background: linear-gradient(135deg, rgba(201,146,58,0.12), rgba(201,146,58,0.04));
          border: 1px solid rgba(201,146,58,0.35);
          font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #e8c989;
        }
        .vcyf-h1 {
          font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
          font-size: clamp(48px, 9vw, 120px);
          line-height: 0.95;
          font-weight: 500;
          letter-spacing: -0.03em;
          margin: 24px 0 24px;
          background: linear-gradient(180deg, #fff8ec 0%, #e9c98a 45%, #8a5e2a 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 60px rgba(233,201,138,0.15);
        }
        .vcyf-h2 {
          font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
          font-size: clamp(34px, 5vw, 62px);
          line-height: 1.05; font-weight: 500; letter-spacing: -0.02em;
          background: linear-gradient(180deg, #fff8ec 0%, #c9a86c 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          margin-bottom: 28px;
        }
        .vcyf-sub { font-size: clamp(17px, 1.6vw, 21px); line-height: 1.55; color: #c9bfae; max-width: 640px; }
        .vcyf-sub strong { color: #f1ece4; font-weight: 600; }

        .vcyf-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 40px; }
        .vcyf-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 16px 26px; border-radius: 999px;
          font-weight: 600; font-size: 15px; letter-spacing: 0.01em;
          text-decoration: none; transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        .vcyf-btn-primary {
          background: linear-gradient(135deg, #f3d691 0%, #c9923a 50%, #8a5a2b 100%);
          color: #1a0f02;
          box-shadow: 0 10px 40px -10px rgba(201,146,58,0.6), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .vcyf-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 50px -10px rgba(201,146,58,0.8), inset 0 1px 0 rgba(255,255,255,0.4); }
        .vcyf-btn-ghost {
          background: rgba(255,255,255,0.04); color: #f1ece4;
          border-color: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
        }
        .vcyf-btn-ghost:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.3); }

        .vcyf-section { padding: 120px 0; position: relative; z-index: 1; }
        .vcyf-section-center { text-align: center; }
        .vcyf-section-center .vcyf-sub { margin: 0 auto; }

        .vcyf-cards-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 60px; }
        @media (max-width: 720px) { .vcyf-cards-2 { grid-template-columns: 1fr; } }
        .vcyf-compare {
          padding: 32px; border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
        }
        .vcyf-compare-dim {
          background: linear-gradient(180deg, rgba(60,40,40,0.25) 0%, rgba(20,10,10,0.1) 100%);
          border-color: rgba(180,90,90,0.15);
        }
        .vcyf-compare-glow {
          background: linear-gradient(180deg, rgba(201,146,58,0.12) 0%, rgba(60,40,20,0.04) 100%);
          border-color: rgba(201,146,58,0.3);
          box-shadow: 0 20px 60px -20px rgba(201,146,58,0.25);
        }
        .vcyf-compare h3 {
          font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
          font-size: 28px; margin-bottom: 24px; font-weight: 500;
        }
        .vcyf-compare-dim h3 { color: #8a7a7a; }
        .vcyf-compare-glow h3 { color: #f3d691; }
        .vcyf-compare ul { list-style: none; padding: 0; margin: 0; }
        .vcyf-compare li { padding: 12px 0; border-top: 1px solid rgba(255,255,255,0.06); font-size: 16px; }
        .vcyf-compare-dim li { color: #8a8076; }
        .vcyf-compare-glow li { color: #e6dfd0; }

        .vcyf-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 60px; }
        @media (max-width: 720px) { .vcyf-stats { grid-template-columns: repeat(2, 1fr); } }
        .vcyf-stat {
          padding: 32px 20px; text-align: center;
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.08); border-radius: 18px;
        }
        .vcyf-counter {
          display: block;
          font-family: 'Reckless', 'Instrument Serif', Georgia, serif;
          font-size: clamp(40px, 5vw, 60px); font-weight: 500; line-height: 1;
          background: linear-gradient(180deg, #fff8ec 0%, #c9923a 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          margin-bottom: 8px;
        }
        .vcyf-stat-label { font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #9a9080; }

        .vcyf-benefits { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 60px; }
        @media (max-width: 720px) { .vcyf-benefits { grid-template-columns: 1fr; } }
        .vcyf-benefit {
          padding: 32px; border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.4s ease;
        }
        .vcyf-benefit:hover {
          transform: translateY(-4px);
          border-color: rgba(201,146,58,0.35);
          background: linear-gradient(180deg, rgba(201,146,58,0.08), rgba(255,255,255,0.01));
        }
        .vcyf-benefit-icon {
          width: 48px; height: 48px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(243,214,145,0.2), rgba(138,90,43,0.1));
          border: 1px solid rgba(201,146,58,0.3);
          display: flex; align-items: center; justify-content: center;
          color: #f3d691; margin-bottom: 20px;
        }
        .vcyf-benefit h3 { font-family: 'Reckless', Georgia, serif; font-size: 24px; font-weight: 500; margin-bottom: 10px; color: #fff8ec; }
        .vcyf-benefit p { color: #b0a89a; font-size: 15px; line-height: 1.55; }

        .vcyf-stories { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 60px; }
        @media (max-width: 900px) { .vcyf-stories { grid-template-columns: 1fr; } }
        .vcyf-story {
          padding: 36px 30px; border-radius: 20px;
          background: linear-gradient(180deg, rgba(60,42,20,0.25), rgba(20,14,8,0.15));
          border: 1px solid rgba(201,146,58,0.18);
          position: relative;
        }
        .vcyf-story-num {
          position: absolute; top: 24px; right: 28px;
          font-family: 'Reckless', Georgia, serif;
          font-size: 60px; line-height: 1; opacity: 0.15; color: #f3d691;
        }
        .vcyf-story p {
          font-family: 'Reckless', Georgia, serif;
          font-size: 22px; line-height: 1.4; color: #f1ece4; margin: 6px 0;
        }

        .vcyf-final {
          text-align: center; padding: 140px 24px;
          position: relative; z-index: 1;
        }
        .vcyf-final-h {
          font-family: 'Reckless', Georgia, serif;
          font-size: clamp(44px, 7vw, 88px); line-height: 1.02; font-weight: 500;
          letter-spacing: -0.025em; margin-bottom: 28px;
          background: linear-gradient(180deg, #fff8ec 0%, #f3d691 40%, #8a5a2b 100%);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .vcyf-footer {
          position: relative; z-index: 1;
          padding: 50px 24px 70px; text-align: center;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .vcyf-footer p {
          font-family: 'Reckless', Georgia, serif;
          font-style: italic; font-size: 16px; color: #8a8276; max-width: 540px; margin: 0 auto;
        }

        .vcyf-fade-up { opacity: 0; transform: translateY(20px); animation: vcyf-fade-up 1s ease forwards; }
        .vcyf-fade-up-2 { animation-delay: 0.15s; }
        .vcyf-fade-up-3 { animation-delay: 0.3s; }
        .vcyf-fade-up-4 { animation-delay: 0.45s; }
        @keyframes vcyf-fade-up { to { opacity: 1; transform: translateY(0); } }

        @media (prefers-reduced-motion: reduce) {
          .vcyf-aurora { animation: none; }
        }
      `}</style>

      <Aurora />

      {/* HERO */}
      <section className="vcyf-section vcyf-shell" style={{ paddingTop: 140, paddingBottom: 80 }}>
        <div className="vcyf-fade-up">
          <span className="vcyf-eyebrow">
            <Flame size={12} /> For Builders. Not Applicants.
          </span>
        </div>
        <h1 className="vcyf-h1 vcyf-fade-up vcyf-fade-up-2">Vibe Code Your Future</h1>
        <div className="vcyf-sub vcyf-fade-up vcyf-fade-up-3">
          <p style={{ margin: 0 }}>
            <strong>You weren't laid off. You were set free.</strong>
          </p>
          <p style={{ marginTop: 12 }}>
            Stop refreshing LinkedIn. Start building something people actually want.
          </p>
        </div>
        <div className="vcyf-cta-row vcyf-fade-up vcyf-fade-up-4">
          <Link to="/reserve" className="vcyf-btn vcyf-btn-primary">
            Reserve Your Founder Handle <ArrowRight size={16} />
          </Link>
          <Link to="/reserve" className="vcyf-btn vcyf-btn-ghost">
            Start Building
          </Link>
        </div>
      </section>

      {/* EMOTIONAL HOOK */}
      <section className="vcyf-section vcyf-shell">
        <h2 className="vcyf-h2" style={{ maxWidth: 800 }}>
          The Best Founders Didn't Wait For Permission.
        </h2>
        <div className="vcyf-sub" style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0 }}>Every year thousands of talented people get laid off.</p>
          <p style={{ margin: 0 }}>Some spend months applying for jobs.</p>
          <p style={{ margin: 0 }}>
            Others build products. Build audiences. Launch startups. And change their lives forever.
          </p>
          <p style={{ margin: 0 }}>
            <strong>The difference isn't talent. It's action.</strong>
          </p>
          <p style={{ margin: 0, color: '#f3d691' }}>Today is your chance to start.</p>
        </div>

        <div className="vcyf-cards-2">
          <div className="vcyf-compare vcyf-compare-dim">
            <h3>Still Applying</h3>
            <ul>
              <li>Updating resumes</li>
              <li>Endless interviews</li>
              <li>Waiting for replies</li>
              <li>Competing for jobs</li>
            </ul>
          </div>
          <div className="vcyf-compare vcyf-compare-glow">
            <h3>Building</h3>
            <ul>
              <li>Shipping products</li>
              <li>Getting feedback</li>
              <li>Growing an audience</li>
              <li>Creating opportunities</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="vcyf-section vcyf-shell vcyf-section-center">
        <h2 className="vcyf-h2">You're Not Building Alone.</h2>
        <p className="vcyf-sub">
          Thousands of founders are already launching products, sharing progress, and building in public.
        </p>
        <div className="vcyf-stats">
          <div className="vcyf-stat">
            <Counter to={stats.makers} suffix="+" />
            <div className="vcyf-stat-label">Founders</div>
          </div>
          <div className="vcyf-stat">
            <Counter to={stats.launched} suffix="+" />
            <div className="vcyf-stat-label">Products Launched</div>
          </div>
          <div className="vcyf-stat">
            <Counter to={stats.votes} suffix="+" />
            <div className="vcyf-stat-label">Votes Cast</div>
          </div>
          <div className="vcyf-stat">
            <Counter to={stats.members} suffix="+" />
            <div className="vcyf-stat-label">Community</div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="vcyf-section vcyf-shell vcyf-section-center">
        <h2 className="vcyf-h2">Everything You Need To Start.</h2>
        <div className="vcyf-benefits" style={{ textAlign: 'left' }}>
          {[
            { icon: <Rocket size={22} />, title: 'Launch Products', body: 'Ship ideas fast and get real feedback.' },
            { icon: <Sparkles size={22} />, title: 'Founder Profile', body: 'Build your public founder identity.' },
            { icon: <Users size={22} />, title: 'Community', body: 'Connect with people on the same journey.' },
            { icon: <TrendingUp size={22} />, title: 'Momentum', body: 'Turn uncertainty into progress.' },
          ].map((b) => (
            <div key={b.title} className="vcyf-benefit">
              <div className="vcyf-benefit-icon">{b.icon}</div>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MINI SUCCESS STORIES */}
      <section className="vcyf-section vcyf-shell vcyf-section-center">
        <h2 className="vcyf-h2">Real Comebacks Start Small.</h2>
        <div className="vcyf-stories" style={{ textAlign: 'left' }}>
          {[
            ['Laid off.', 'Built a side project.', 'Got first paying customer.'],
            ['Burned out at a startup.', 'Started shipping every weekend.', 'Built an audience.'],
            ["Couldn't find the right job.", 'Built one instead.', ''],
          ].map((lines, i) => (
            <div key={i} className="vcyf-story">
              <span className="vcyf-story-num">0{i + 1}</span>
              {lines.filter(Boolean).map((l, j) => (
                <p key={j}>{l}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="vcyf-final">
        <div className="vcyf-shell">
          <h2 className="vcyf-final-h">Your Next Startup Starts Today.</h2>
          <p className="vcyf-sub" style={{ margin: '0 auto 36px', textAlign: 'center' }}>
            The best revenge is building something that works. Reserve your founder handle and start your next chapter.
          </p>
          <div className="vcyf-cta-row" style={{ justifyContent: 'center' }}>
            <Link to="/reserve" className="vcyf-btn vcyf-btn-primary">
              Reserve Your Founder Handle <ArrowRight size={16} />
            </Link>
            <Link to="/reserve" className="vcyf-btn vcyf-btn-ghost">
              Explore Launch
            </Link>
          </div>
        </div>
      </section>

      <footer className="vcyf-footer">
        <p>One day you'll look back and realize the layoff was the beginning.</p>
      </footer>
    </div>
  );
};

export default VibeCodeYourFuture;
