import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Rocket,
  Search,
  ThumbsUp,
  Trophy,
  Calendar,
  Share2,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle,
  Compass,
  Megaphone,
  MessageCircle,
  HelpCircle,
  Tag,
  type LucideIcon,
} from 'lucide-react';

type Section = {
  id: string;
  label: string;
  eyebrow: string;
  eyebrowIcon: LucideIcon;
  title: string;
  description: string;
};

const sections: Section[] = [
  {
    id: 'what-is-launch',
    label: 'What is Launch',
    eyebrow: 'Overview',
    eyebrowIcon: Sparkles,
    title: 'What is Launch?',
    description:
      'A daily product discovery platform where founders ship new AI and tech products, and the community upvotes the best ones. Friendlier and founder-first — built for makers who actually want to grow.',
  },
  {
    id: 'for-makers',
    label: 'For Makers',
    eyebrow: 'For Makers',
    eyebrowIcon: Megaphone,
    title: 'Launch your product in four steps',
    description:
      'Whether you\'re shipping your first SaaS or your tenth side project, Launch helps you reach the people most likely to try it.',
  },
  {
    id: 'for-discoverers',
    label: 'For Discoverers',
    eyebrow: 'For Discoverers',
    eyebrowIcon: Search,
    title: 'Find tools before everyone else does',
    description:
      'Launch is the easiest way to keep up with what\'s actually being built — not just what\'s trending on Twitter.',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    eyebrow: 'Pricing',
    eyebrowIcon: Tag,
    title: 'Simple pricing',
    description:
      'You can launch for free. Upgrade only if you want speed, scheduling, and extra promotion.',
  },
  {
    id: 'community',
    label: 'Community',
    eyebrow: 'Community',
    eyebrowIcon: Users,
    title: 'Join the conversation',
    description:
      'Launch is more than a leaderboard. Share what you\'re building, get feedback, and meet other founders.',
  },
  {
    id: 'faq',
    label: 'FAQ',
    eyebrow: 'FAQ',
    eyebrowIcon: HelpCircle,
    title: 'Quick answers',
    description: 'The basics — answered in one line each.',
  },
];

const overviewCards = [
  {
    icon: Rocket,
    title: 'Daily launches',
    description: 'New products every day across every category.',
  },
  {
    icon: ThumbsUp,
    title: 'Upvote-only',
    description: 'No downvotes. Just signal what you love.',
  },
  {
    icon: Trophy,
    title: 'Real rewards',
    description: 'Awards, backlinks, newsletter & social features.',
  },
];

const makerSteps = [
  {
    icon: Rocket,
    title: 'Submit your product',
    description: 'Add your name, tagline, screenshots, categories, and tech stack. ~5 minutes.',
  },
  {
    icon: Calendar,
    title: 'Pick a launch date',
    description: 'Free launches are queued 7+ days out. Pro and Pass let you choose any date.',
  },
  {
    icon: Share2,
    title: 'Rally your network',
    description: 'Share on X, LinkedIn, and Telegram. The first 24 hours decide your rank.',
  },
  {
    icon: Trophy,
    title: 'Win awards & grow',
    description: 'Top products earn daily, weekly, and monthly badges plus newsletter features.',
  },
];

const discovererPerks = [
  {
    icon: Compass,
    title: 'Daily fresh launches',
    description: 'A new batch of products every day across AI, SaaS, no-code, web3, and more.',
  },
  {
    icon: ThumbsUp,
    title: 'Upvote what you love',
    description: 'Help the best products rise. No downvotes — Launch is upvote-only.',
  },
  {
    icon: MessageCircle,
    title: 'Talk to the makers',
    description: 'Comment, ask questions, and share feedback directly with founders.',
  },
  {
    icon: Sparkles,
    title: 'Track winners over time',
    description: 'Browse daily, weekly, monthly, and yearly archives to see what won.',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    suffix: '',
    description: 'Basic listing in our launch queue (7+ days out).',
    cta: 'Start free',
    href: '/submit',
    highlight: false,
  },
  {
    name: 'Pro · Most popular',
    price: '$39',
    suffix: '',
    description: 'Choose your date, newsletter feature, social promotion, badges.',
    cta: 'See Pro',
    href: '/pricing',
    highlight: true,
  },
  {
    name: 'Pass',
    price: '$99',
    suffix: '/yr',
    description: 'Unlimited Pro launches for a full year.',
    cta: 'Get the Pass',
    href: '/pass',
    highlight: false,
  },
];

const communityCards = [
  {
    icon: MessageCircle,
    title: 'Forums',
    description: 'Discuss launches, share strategy, and ask for feedback.',
    cta: 'Visit forums',
    href: 'https://forums.trylaunch.ai',
    external: true,
  },
  {
    icon: Sparkles,
    title: 'Newsletter',
    description: 'Top launches and winners delivered every Monday.',
    cta: 'Subscribe',
    href: '/newsletter',
    external: false,
  },
];

const faqs = [
  {
    icon: HelpCircle,
    title: 'Is launching really free?',
    description: 'Yes. Free launches enter a queue 7+ days out. Pro ($39) lets you pick any date and adds promotion.',
  },
  {
    icon: HelpCircle,
    title: 'Do I get a backlink?',
    description: 'Yes — every product page links to your site with a dofollow link. No badge required.',
  },
  {
    icon: HelpCircle,
    title: 'How do I win an award?',
    description: 'Daily, weekly, and monthly winners are based on upvotes during the launch window. Rally your network in the first 24 hours.',
  },
  {
    icon: HelpCircle,
    title: 'Can I just browse without launching?',
    description: 'Absolutely. Browse today\'s launches, follow makers, and subscribe to the newsletter.',
  },
];

// Reusable section header — keeps every block visually consistent
const SectionHeader = ({
  eyebrow,
  EyebrowIcon,
  title,
  description,
}: {
  eyebrow: string;
  EyebrowIcon: LucideIcon;
  title: string;
  description: string;
}) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
      <EyebrowIcon className="h-4 w-4" />
      {eyebrow}
    </div>
    <h2 className="font-reckless text-3xl font-bold mb-3">{title}</h2>
    <p className="text-muted-foreground max-w-2xl">{description}</p>
  </div>
);

// Reusable info card — same layout everywhere
const InfoCard = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) => (
  <Card>
    <CardContent className="p-6">
      {Icon && <Icon className="h-5 w-5 text-primary mb-3" />}
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </CardContent>
  </Card>
);

const Start = () => {
  const [activeId, setActiveId] = useState<string>(sections[0].id);

  // Scroll-spy for the right-side TOC
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Helmet>
        <title>Start Here — How Launch Works | Launch</title>
        <meta
          name="description"
          content="New to Launch? Learn how to launch your product, discover the best new AI and SaaS tools, and grow with our community of founders."
        />
        <link rel="canonical" href="https://trylaunch.ai/start" />
        <meta property="og:title" content="Start Here — How Launch Works" />
        <meta
          property="og:description"
          content="The fastest way to understand Launch. For founders shipping products and the people who love discovering them."
        />
        <meta property="og:url" content="https://trylaunch.ai/start" />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome to Launch
            </div>
            <h1 className="font-reckless text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Where founders launch and the world discovers what's next
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              A community-powered launchpad for AI, SaaS, and indie products.
              Whether you're shipping something or just love finding new tools — start here.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/submit">
                  Launch a product
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Discover products</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Body: content + sticky right-side TOC */}
        <div className="container mx-auto px-4 max-w-7xl pb-12">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_220px] gap-12">
            {/* Main content column */}
            <div className="min-w-0 max-w-3xl mx-auto lg:mx-0 w-full space-y-16">
              {/* What is Launch */}
              <section id={sections[0].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[0].eyebrow}
                  EyebrowIcon={sections[0].eyebrowIcon}
                  title={sections[0].title}
                  description={sections[0].description}
                />
                <div className="grid sm:grid-cols-3 gap-4">
                  {overviewCards.map((c) => (
                    <InfoCard key={c.title} icon={c.icon} title={c.title} description={c.description} />
                  ))}
                </div>
              </section>

              {/* For Makers */}
              <section id={sections[1].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[1].eyebrow}
                  EyebrowIcon={sections[1].eyebrowIcon}
                  title={sections[1].title}
                  description={sections[1].description}
                />
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {makerSteps.map((step, i) => (
                    <Card key={step.title}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <step.icon className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-semibold">{step.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link to="/submit">
                      Submit your product
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/product-launch-strategy">Read the launch playbook</Link>
                  </Button>
                </div>
              </section>

              {/* For Discoverers */}
              <section id={sections[2].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[2].eyebrow}
                  EyebrowIcon={sections[2].eyebrowIcon}
                  title={sections[2].title}
                  description={sections[2].description}
                />
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {discovererPerks.map((p) => (
                    <InfoCard key={p.title} icon={p.icon} title={p.title} description={p.description} />
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link to="/">
                      Browse today's launches
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/categories">Explore categories</Link>
                  </Button>
                </div>
              </section>

              {/* Pricing */}
              <section id={sections[3].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[3].eyebrow}
                  EyebrowIcon={sections[3].eyebrowIcon}
                  title={sections[3].title}
                  description={sections[3].description}
                />
                <div className="grid sm:grid-cols-3 gap-4">
                  {pricingPlans.map((plan) => (
                    <Card key={plan.name} className={plan.highlight ? 'border-primary' : ''}>
                      <CardContent className="p-6">
                        <p className={`text-sm font-medium mb-1 ${plan.highlight ? 'text-primary' : 'text-muted-foreground'}`}>
                          {plan.name}
                        </p>
                        <p className="text-3xl font-bold mb-3">
                          {plan.price}
                          {plan.suffix && (
                            <span className="text-base font-normal text-muted-foreground">{plan.suffix}</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                        <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="w-full">
                          <Link to={plan.href}>{plan.cta}</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Community */}
              <section id={sections[4].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[4].eyebrow}
                  EyebrowIcon={sections[4].eyebrowIcon}
                  title={sections[4].title}
                  description={sections[4].description}
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  {communityCards.map((c) => (
                    <InfoCard key={c.title} icon={c.icon} title={c.title} description={c.description}>
                      <Button asChild variant="outline" size="sm">
                        {c.external ? (
                          <a href={c.href} target="_blank" rel="noopener noreferrer">
                            {c.cta}
                          </a>
                        ) : (
                          <Link to={c.href}>{c.cta}</Link>
                        )}
                      </Button>
                    </InfoCard>
                  ))}
                </div>
              </section>

              {/* FAQ */}
              <section id={sections[5].id} className="scroll-mt-24">
                <SectionHeader
                  eyebrow={sections[5].eyebrow}
                  EyebrowIcon={sections[5].eyebrowIcon}
                  title={sections[5].title}
                  description={sections[5].description}
                />
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  {faqs.map((f) => (
                    <InfoCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
                  ))}
                </div>
                <Button asChild variant="outline">
                  <Link to="/faq">Read the full FAQ</Link>
                </Button>
              </section>

              {/* Maker benefits — kept consistent as a final card grid before CTA */}
              <section className="scroll-mt-24">
                <SectionHeader
                  eyebrow="Why founders choose Launch"
                  EyebrowIcon={CheckCircle}
                  title="What you get on every launch"
                  description="The same set of perks for everyone who ships on Launch — free or paid."
                />
                <Card>
                  <CardContent className="p-6">
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {[
                        'Reach thousands of founders, builders, and early adopters',
                        'Dofollow backlinks on every product page (great for SEO)',
                        'Featured in our weekly newsletter (2K+ subscribers)',
                        'Auto-promoted on X and LinkedIn',
                        'Verified badges to embed on your site',
                        'Built-in analytics for views, votes, and clicks',
                      ].map((b) => (
                        <li key={b} className="flex items-start gap-3 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Right-side sticky TOC (desktop only) */}
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  On this page
                </p>
                <ul className="space-y-1 border-l border-border">
                  {sections.map((s) => {
                    const active = activeId === s.id;
                    return (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className={`block pl-4 -ml-px py-1.5 text-sm border-l-2 transition-colors ${
                            active
                              ? 'border-primary text-foreground font-medium'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {s.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
          </div>
        </div>

        {/* Final CTA */}
        <section className="py-20 border-t border-border">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="font-reckless text-4xl font-bold mb-4">Ready to dive in?</h2>
            <p className="text-muted-foreground mb-8">
              Pick your path — submit a product or start discovering what's new today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/submit">
                  Launch a product
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Discover products</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Start;
