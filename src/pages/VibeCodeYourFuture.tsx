import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import alexPhoto from '@/assets/alex-vcyf.png';
import signature from '@/assets/signature.png';
import { isCampaignHost, CAMPAIGN_ORIGIN } from '@/lib/campaignHost';
import { BuilderWall } from '@/components/campaign/BuilderWall';
import {
  CAMPAIGN_SLUG,
  setCampaignIntent,
  trackCampaignEvent,
} from '@/lib/campaign';

const FAQS = [
  {
    q: 'What is Vibe Code Your Future?',
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
    q: 'What is Launch?',
    a: 'Launch is the discovery platform for vibe coded startups. Founders launch their products, the community upvotes and gives feedback, and the best products get in front of hundreds of thousands of monthly active users.',
  },
  {
    q: 'How do I get featured?',
    a: 'Click "Add Your App" and go through the normal Launch submission flow. Products submitted through this page are tagged to the campaign, carry the Vibe Code Your Future badge, and appear on the Builder Wall automatically.',
  },
];

const VibeCodeYourFuture = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Same component, two homes: canonical/OG follow the hostname it was served from.
  const pageUrl = isCampaignHost() ? CAMPAIGN_ORIGIN : 'https://trylaunch.ai/vibecodeyourfuture';

  const welcomeSlug = searchParams.get('welcome');
  const [showWelcome, setShowWelcome] = useState(!!welcomeSlug);

  useEffect(() => {
    trackCampaignEvent('campaign_page_view');
  }, []);

  useEffect(() => {
    if (welcomeSlug) setShowWelcome(true);
  }, [welcomeSlug]);

  const handleAddYourApp = () => {
    setCampaignIntent(CAMPAIGN_SLUG);
    trackCampaignEvent('campaign_cta_clicked');
    navigate(`/submit?campaign=${CAMPAIGN_SLUG}`);
  };

  const closeWelcome = () => {
    setShowWelcome(false);
    const next = new URLSearchParams(searchParams);
    next.delete('welcome');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Vibe Code Your Future — Build your own software business with AI</title>
        <meta
          name="description"
          content="A movement for people building their own future with AI. Launch your vibe coded startup, join the Builder Wall, and become part of a growing community of founders."
        />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content="Vibe Code Your Future" />
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
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section>
        <div className="container mx-auto max-w-7xl px-4 py-12 text-center sm:py-16">
          <h1 className="mx-auto max-w-4xl text-3xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl">
            Vibe Code Your Future
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A movement from{' '}
            <a
              href="https://trylaunch.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Launch
            </a>{' '}
            for people building their own future with AI. Whether you were laid off,
            left your job, or simply decided to build, launch your vibe coded startup and join a
            growing community of founders creating the next generation of software.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="h-12 gap-2 px-8 text-base" onClick={handleAddYourApp}>
                Add Your App
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
            <p className="text-sm text-muted-foreground">
              Every startup launched on Launch appears on the Builder Wall below.
            </p>
          </div>
        </div>
      </section>

      {/* Builder Wall */}
      <section>
        <div className="container mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <BuilderWall />
        </div>
      </section>

      {/* Alex's Letter */}
      <section id="letter" className="border-b">
        <div className="container mx-auto max-w-2xl px-4 py-16 sm:py-20">
          <div className="rounded-lg border border-border bg-card p-6 md:p-8">
            <h2 className="mb-8 text-center font-reckless text-2xl sm:text-3xl">Why I built this</h2>

            <div className="space-y-5 text-base leading-7 text-foreground/90">
              <p className="text-center text-muted-foreground">
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
                    className="mb-1 h-10 w-auto"
                  />
                  <h3 className="text-lg font-bold">Alex MacGregor</h3>
                  <p className="mb-2 text-base font-bold text-muted-foreground">Founder, Launch</p>
                  <a
                    href="https://x.com/alexmacgregor__"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
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
      <section>
        <div className="container mx-auto max-w-3xl px-4 py-20 sm:py-24">
          <h2 className="mb-10 text-center font-reckless text-3xl sm:text-4xl">
            Frequently asked questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left text-base">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-[15px] leading-7 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <Button size="lg" className="h-12 gap-2 px-8 text-base" onClick={handleAddYourApp}>
              Add Your App
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Campaign success screen */}
      <Dialog open={showWelcome} onOpenChange={(open) => !open && closeWelcome()}>
        <DialogContent className="sm:max-w-md text-center">
          <h2 className="font-reckless text-2xl">🎉 Welcome to the movement.</h2>
          <p className="text-muted-foreground">
            Your startup is now part of Vibe Code Your Future. It's also live on Launch where
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
    </>
  );
};

export default VibeCodeYourFuture;
