import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Rocket,
  Search,
  ThumbsUp,
  Trophy,
  Calendar,
  Share2,
  Mail,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle,
  Compass,
  Megaphone,
  MessageCircle,
} from 'lucide-react';

const sections = [
  { id: 'what-is-launch', label: 'What is Launch' },
  { id: 'for-makers', label: 'For Makers' },
  { id: 'for-discoverers', label: 'For Discoverers' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'community', label: 'Community' },
  { id: 'faq', label: 'FAQ' },
];

const makerSteps = [
  {
    icon: Rocket,
    title: 'Submit your product',
    description:
      'Add your name, tagline, screenshots, categories, and tech stack. Takes ~5 minutes.',
  },
  {
    icon: Calendar,
    title: 'Pick a launch date',
    description:
      'Free launches are queued 7+ days out. Pro and Pass let you choose any date.',
  },
  {
    icon: Share2,
    title: 'Rally your network',
    description:
      'Share your launch link on X, LinkedIn, and Telegram. The first 24 hours decide your rank.',
  },
  {
    icon: Trophy,
    title: 'Win awards & grow',
    description:
      'Top products earn daily, weekly, and monthly badges plus newsletter and social features.',
  },
];

const makerBenefits = [
  'Reach thousands of founders, builders, and early adopters',
  'Dofollow backlinks on every product page (great for SEO)',
  'Featured in our weekly newsletter (2K+ subscribers)',
  'Auto-promoted on X and LinkedIn',
  'Verified badges to embed on your site',
  'Built-in analytics for views, votes, and clicks',
];

const discovererPerks = [
  {
    icon: Compass,
    title: 'Daily fresh launches',
    description:
      'A new batch of products every day across AI, SaaS, no-code, web3, and more.',
  },
  {
    icon: ThumbsUp,
    title: 'Upvote what you love',
    description:
      'Help the best products rise. No downvotes — Launch is upvote-only.',
  },
  {
    icon: MessageCircle,
    title: 'Talk to the makers',
    description:
      'Comment, ask questions, and share feedback directly with founders.',
  },
  {
    icon: Sparkles,
    title: 'Track winners over time',
    description:
      'Browse daily, weekly, monthly, and yearly archives to see what won.',
  },
];

const Start = () => {
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

        {/* Anchor nav */}
        <nav className="sticky top-16 z-30 bg-background/80 backdrop-blur border-y border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <ul className="flex gap-1 overflow-x-auto py-2 text-sm">
              {sections.map((s) => (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    className="px-3 py-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* What is Launch */}
        <section id="what-is-launch" className="py-16 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-reckless text-3xl font-bold mb-4">What is Launch?</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Launch is a daily product discovery platform. Founders submit new AI and tech
              products, the community upvotes the best ones, and the top launches earn awards,
              backlinks, and newsletter features. Think of it as a friendlier, founder-first
              alternative to traditional launch sites — built for makers who actually want to grow.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5">
                  <Rocket className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold mb-1">Daily launches</p>
                  <p className="text-sm text-muted-foreground">
                    New products every day across every category.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <ThumbsUp className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold mb-1">Upvote-only</p>
                  <p className="text-sm text-muted-foreground">
                    No downvotes. Just signal what you love.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Trophy className="h-5 w-5 text-primary mb-2" />
                  <p className="font-semibold mb-1">Real rewards</p>
                  <p className="text-sm text-muted-foreground">
                    Awards, backlinks, newsletter & social features.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* For Makers */}
        <section id="for-makers" className="py-16 bg-muted/30 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
              <Megaphone className="h-4 w-4" />
              For Makers
            </div>
            <h2 className="font-reckless text-3xl font-bold mb-4">
              Launch your product in four steps
            </h2>
            <p className="text-muted-foreground mb-10 max-w-2xl">
              Whether you're shipping your first SaaS or your tenth side project, Launch helps
              you reach the people most likely to try it.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-10">
              {makerSteps.map((step, i) => (
                <Card key={step.title}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                        {i + 1}
                      </div>
                      <div>
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

            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <h3 className="text-xl font-semibold mb-4">Why founders choose Launch</h3>
                <ul className="space-y-3">
                  {makerBenefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Ready to launch?</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Submission is free. Upgrade only if you want to choose your date or get
                    extra promotion.
                  </p>
                  <div className="flex flex-col gap-2">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* For Discoverers */}
        <section id="for-discoverers" className="py-16 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
              <Search className="h-4 w-4" />
              For Discoverers
            </div>
            <h2 className="font-reckless text-3xl font-bold mb-4">
              Find tools before everyone else does
            </h2>
            <p className="text-muted-foreground mb-10 max-w-2xl">
              Launch is the easiest way to keep up with what's actually being built —
              not just what's trending on Twitter.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {discovererPerks.map((p) => (
                <Card key={p.title}>
                  <CardContent className="p-6">
                    <p.icon className="h-5 w-5 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  </CardContent>
                </Card>
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
              <Button asChild variant="ghost">
                <Link to="/newsletter">Get the weekly newsletter</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 bg-muted/30 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-reckless text-3xl font-bold mb-4">Simple pricing</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              You can launch for free. Upgrade only if you want speed, scheduling, and
              extra promotion.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Free</p>
                  <p className="text-3xl font-bold mb-3">$0</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Basic listing in our launch queue (7+ days out).
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/submit">Start free</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-primary mb-1">Pro · Most popular</p>
                  <p className="text-3xl font-bold mb-3">$39</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose your date, newsletter feature, social promotion, badges.
                  </p>
                  <Button asChild className="w-full">
                    <Link to="/pricing">See Pro</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pass</p>
                  <p className="text-3xl font-bold mb-3">$99<span className="text-base font-normal text-muted-foreground">/yr</span></p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlimited Pro launches for a full year.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/pass">Get the Pass</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Community */}
        <section id="community" className="py-16 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Community
            </div>
            <h2 className="font-reckless text-3xl font-bold mb-4">Join the conversation</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Launch is more than a leaderboard. Share what you're building, get feedback,
              and meet other founders.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Forums</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Discuss launches, share strategy, and ask for feedback.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <a href="https://forums.trylaunch.ai" target="_blank" rel="noopener noreferrer">
                      Visit forums
                    </a>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-1">Newsletter</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Top launches and winners delivered every Monday.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/newsletter">Subscribe</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 bg-muted/30 scroll-mt-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="font-reckless text-3xl font-bold mb-6">Quick answers</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Is launching really free?',
                  a: 'Yes. Free launches enter a queue 7+ days out. Pro ($39) lets you pick any date and adds promotion.',
                },
                {
                  q: 'Do I get a backlink?',
                  a: 'Yes — every product page links to your site with a dofollow link. No badge required.',
                },
                {
                  q: 'How do I win an award?',
                  a: 'Daily, weekly, and monthly winners are based on upvotes during the launch window. Rally your network in the first 24 hours.',
                },
                {
                  q: 'Can I just browse without launching?',
                  a: 'Absolutely. Browse today\u2019s launches, follow makers, and subscribe to the newsletter.',
                },
              ].map((item) => (
                <Card key={item.q}>
                  <CardContent className="p-5">
                    <p className="font-semibold mb-1">{item.q}</p>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link to="/faq">Read the full FAQ</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
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
                <Link to="/">
                  <Mail className="mr-2 h-4 w-4" />
                  Discover products
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Start;
