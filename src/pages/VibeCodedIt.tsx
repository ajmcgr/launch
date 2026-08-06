import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import campaignIcon from '@/assets/li-icon-2.png.asset.json';
import vibeLogo from '@/assets/vibecodedit-logo.png.asset.json';
import vibeLogoDark from '@/assets/vibecodedit-logo-dark.png.asset.json';
import alexPhoto from '@/assets/alex-vcyf.png';
import signature from '@/assets/signature.png';
import signatureDark from '@/assets/am-t.png';
import { isCampaignHost, CAMPAIGN_ORIGIN } from '@/lib/campaignHost';
import { useLaunchedProductCount } from '@/hooks/use-campaign-products';
import { BuilderWall } from '@/components/campaign/BuilderWall';
import { ViewToggle } from '@/components/ViewToggle';
import CampaignHeader from '@/components/campaign/CampaignHeader';
import CampaignSideNav from '@/components/campaign/CampaignSideNav';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  CAMPAIGN_SLUG,
  setCampaignIntent,
  trackCampaignEvent,
} from '@/lib/campaign';

const buildFaqs = (appCount: string) => [
  {
    q: 'What is Vibe Coded It?',
    a: 'A movement for people building their own future with AI. Instead of waiting for the next job offer, you build software, launch it publicly, and join a community of founders doing the same. It runs on Launch, the largest vibe coding community in the world.',
  },
  {
    q: 'Who is this for?',
    a: 'Anyone who has been laid off, left their job, or simply decided to start building. Designers, marketers, engineers, operators, students — if you have an idea and an AI tool, you qualify.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. Most people on the Builder Wall shipped their first product using AI tools like Lovable, Cursor, Claude Code, Bolt or Replit. Launch itself was built by a founder with no coding experience.',
  },
  {
    q: 'How many apps are on the Builder Wall?',
    a: `Over ${appCount} vibe coded apps have been added to the Builder Wall, and more are launched every day.`,
  },
  {
    q: 'What is Launch?',
    a: 'Launch is the discovery platform for vibe coded startups. Founders launch their products, the community upvotes and gives feedback, and the best products get in front of hundreds of thousands of monthly active users.',
  },
  {
    q: 'How do I get featured?',
    a: 'Click "Submit Your App" and go through the normal Launch submission flow. Products submitted through this page are tagged to the campaign, carry the Vibe Coded It badge, and appear on the Builder Wall automatically.',
  },
];

const VibeCodedIt = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  // Same component, two homes: canonical/OG follow the hostname it was served from.
  const pageUrl = isCampaignHost() ? CAMPAIGN_ORIGIN : 'https://trylaunch.ai/vibecodedit';

  const welcomeSlug = searchParams.get('welcome');
  const [showWelcome, setShowWelcome] = useState(!!welcomeSlug);
  const [wallView, setWallView] = useState<'list' | 'grid' | 'compact' | 'semi-compact'>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('vibecodedit:view') : null;
    if (stored === 'grid' || stored === 'compact' || stored === 'semi-compact' || stored === 'list') {
      return stored;
    }
    return 'grid';
  });

  const changeWallView = (v: 'list' | 'grid' | 'compact' | 'semi-compact') => {
    setWallView(v);
    try {
      localStorage.setItem('vibecodedit:view', v);
    } catch {
      /* ignore */
    }
  };
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showHero, setShowHero] = useState(true);

  const { data: launchedCount } = useLaunchedProductCount();
  const rawCount = launchedCount || 0;
  const roundedCount = rawCount >= 100 ? Math.floor(rawCount / 50) * 50 : rawCount;
  const appCount = roundedCount.toLocaleString();
  const faqs = useMemo(() => buildFaqs(appCount), [appCount]);

  useEffect(() => {
    trackCampaignEvent('campaign_page_view');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) setShowHero(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) setShowHero(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (welcomeSlug) setShowWelcome(true);
  }, [welcomeSlug]);

  // Mobile detection resolves after first paint: fall back to semi-compact
  // for phones that have no saved preference yet.
  useEffect(() => {
    if (isMobile && !localStorage.getItem('vibecodedit:view')) {
      setWallView('semi-compact');
    }
  }, [isMobile]);


  const handleAddYourApp = () => {
    setCampaignIntent(CAMPAIGN_SLUG);
    trackCampaignEvent('campaign_cta_clicked');
    const url = isCampaignHost()
      ? `https://trylaunch.ai/submit?campaign=${CAMPAIGN_SLUG}`
      : `/submit?campaign=${CAMPAIGN_SLUG}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const closeWelcome = () => {
    setShowWelcome(false);
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubscribing) return;

    setIsSubscribing(true);
    setSubscribeMessage(null);
    setSubscribeError(false);

    try {
      const { error } = await supabase.functions.invoke('subscribe-to-newsletter', {
        body: { email: email.trim() },
      });

      if (error) throw error;

      trackCampaignEvent('campaign_newsletter_subscribed');
      setSubscribeMessage('You’re subscribed. Welcome to the movement.');
      setEmail('');
    } catch (err) {
      setSubscribeError(true);
      setSubscribeMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Vibe Coded It — Build Something Worth Launching</title>
        <meta
          name="description"
          content="A movement for people building their own future with AI. Launch your vibe coded startup, join the Builder Wall, and become part of a growing community of founders."
        />
        <link rel="canonical" href={pageUrl} />
        <link rel="icon" href="/favicon-vibecodedit.png" type="image/png" />
        <meta property="og:title" content="Vibe Coded It" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta
          property="og:description"
          content="A movement for people building their own future with AI. Launch your startup and join the Builder Wall."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>
      </Helmet>

      {/* Campaign header */}
      <CampaignHeader />
      <CampaignSideNav />

      {/* Hero */}
      {showHero && !user && (
        <section className="relative pt-8 sm:pt-10 lg:pl-20 min-[1700px]:pr-[200px]">
          <div className="w-full px-4">
            <div className="relative w-full px-6 py-8 sm:py-10 text-center bg-[#fcfcfc] dark:bg-card dark:border dark:border-border rounded-2xl">
            <h1 className="mx-auto max-w-xl text-5xl sm:text-6xl font-semibold tracking-tight text-foreground">
              Vibe Coded It
            </h1>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">
              Whether you were laid off, left your job, or simply decided to build,
              launch your vibe coded startup and join a growing community of founders
              creating the next generation of software.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <Button className="gap-2" onClick={handleAddYourApp}>
                Submit Your App
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a
                href="#letter"
                className="text-sm font-medium text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('letter')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Read the letter
              </a>
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Apps title + app count + view toggle */}
      <section className="lg:pl-20 min-[1700px]:pr-[200px]">
        <div className="w-full px-4 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Apps</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-5">
                {rawCount > 0 && (
                  <>Over <span className="font-semibold text-foreground">{appCount}</span> vibe coded apps added</>
                )}
              </p>
            </div>
            <ViewToggle
              view={wallView}
              onViewChange={changeWallView}
              allowSemiCompact
            />
          </div>
        </div>
      </section>


      {/* Builder Wall */}
      <section className="lg:pl-20 min-[1700px]:pr-[200px]">
        <div className="w-full px-4 pb-8 pt-4 sm:pb-8 sm:pt-6">
          <BuilderWall view={wallView} />
        </div>
      </section>

      {/* Alex's Letter */}
      <section id="letter" className="lg:pl-20">
        <div className="container mx-auto max-w-2xl px-4 py-16 sm:py-20">
          <div className="rounded-lg border border-border bg-card p-8 md:p-12">
            <h2 className="mb-8 text-center font-reckless text-3xl sm:text-4xl">An Open Letter</h2>

            <div className="space-y-5 text-lg leading-8 text-foreground/90">
              <p className="text-center text-base text-muted-foreground">
                An open letter to anyone who was just laid off.
              </p>

              <p>
                <strong>Hey,</strong>
              </p>

              <p>
                If you're reading this, there's a good chance you just lost your job. Maybe it was a
                Slack message. Maybe a calendar invite with no title. Maybe an email at 6am. However
                it happened, I'm sorry. It hurts, and it's okay that it hurts.
              </p>

              <p>
                I'm not going to tell you that "everything happens for a reason" or that you should be
                grateful. That's not fair, and it's not the point of this letter.
              </p>

              <p>
                The point is this: a lot of the best founders I know started exactly where you are
                right now. Not because they planned it. Because the job ended, and they finally had
                the time, the anger, and the quiet to build the thing they'd been thinking about for
                years.
              </p>

              <p>
                You don't need permission and you certainly don't need a co-founder or indeed a
                perfect idea. You need a small, honest first step. Something you can ship this week.
                Something tiny that proves to yourself that you can still make things.
              </p>

              <p>
                I did. I built{' '}
                <a
                  href="https://trylaunch.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Launch
                </a>{' '}
                without any coding experience into the largest vibe code community in the world.
              </p>

              <p>You weren't laid off, you were set free. Take a walk. Drink some water.</p>

              <p>
                <strong>Stop applying, and start building. You've got this.</strong>
              </p>

              <p>
                PS - I created a free playbook{' '}
                <a
                  href="https://docs.google.com/presentation/d/19J_RAtPgpW_Xx5Uk5HsJhiHJJ1ajtCB-7AYB_zLT6f4/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  here
                </a>{' '}
                to help you get started.
              </p>

              <div className="pt-6">
                <div className="flex flex-col items-start">
                  <img
                    src={alexPhoto}
                    alt="Alex MacGregor"
                    width={112}
                    height={112}
                    loading="lazy"
                    className="mb-4 h-28 w-28 object-cover"
                  />
                  <img
                    src={signature}
                    alt="Alex MacGregor signature"
                    loading="lazy"
                    className="mb-1 h-10 w-auto dark:hidden"
                  />
                  <img
                    src={signatureDark}
                    alt="Alex MacGregor signature"
                    loading="lazy"
                    className="mb-1 hidden h-10 w-auto dark:block"
                  />
                  <h3 className="text-xl font-bold">Alex MacGregor</h3>
                  <p className="mb-2 text-lg font-bold text-muted-foreground">Founder, Launch</p>
                  <a
                    href="https://x.com/alexmacgregor__"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-primary hover:underline"
                  >
                    Follow me on X
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lg:pl-20">
        <div className="container mx-auto max-w-2xl px-4 py-16 sm:py-20">
          <h2 className="mb-8 text-center font-reckless text-3xl sm:text-4xl">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-base sm:text-lg">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-base leading-7 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 text-center">
            <Button size="lg" className="h-12 gap-2 px-8 text-base" onClick={handleAddYourApp}>
              Submit Your App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="lg:pl-20">
        <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-reckless text-3xl sm:text-4xl">Get the Newsletter</h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Subscribe for free. Weekly updates on launches, no filler.
            </p>

            <form onSubmit={handleSubscribe} className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <Button
                type="submit"
                size="lg"
                disabled={isSubscribing}
                className="h-12 w-full sm:w-auto px-8 text-base whitespace-nowrap"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </form>

            {subscribeMessage && (
              <p
                className={`mt-4 text-sm ${
                  subscribeError ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {subscribeMessage}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Floating Submit Your App CTA */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
        <Button
          size="lg"
          className="h-12 gap-2 px-6 text-base shadow-lg"
          onClick={handleAddYourApp}
        >
          Submit Your App
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Campaign success screen */}

      <Dialog open={showWelcome} onOpenChange={(open) => !open && closeWelcome()}>
        <DialogContent className="sm:max-w-md text-center">
          <h2 className="font-reckless text-3xl">🎉 Welcome to the movement.</h2>
          <p className="text-base text-muted-foreground">
            Your startup is now part of Vibe Coded It. It's also live on Launch where
            thousands of builders can discover it.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Button asChild size="lg">
              <Link to={`/launch/${welcomeSlug}`}>View my Launch page</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={closeWelcome}>
              See the Builder Wall
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="h-[64px] lg:hidden" aria-hidden />
    </>
  );
};

export default VibeCodedIt;
