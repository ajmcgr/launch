import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

type Variant = 'launch' | 'submit' | 'newsletter' | 'profile' | 'browse';

const COPY: Record<Variant, { heading: string; body: string; label: string; to: string }> = {
  launch: {
    heading: 'Ready to launch your startup?',
    body: 'Launch puts your product in front of founders, vibe coders and early adopters actively looking for new tools.',
    label: 'Launch your startup',
    to: '/submit',
  },
  submit: {
    heading: 'Submit your product on Launch',
    body: 'Free to submit, a permanent dofollow backlink, and a launch page that keeps sending traffic long after launch day.',
    label: 'Submit your product',
    to: '/submit',
  },
  newsletter: {
    heading: 'Get the launch playbook each week',
    body: 'One email, every Monday: the best launches, the tactics behind them, and what actually moved the numbers.',
    label: 'Join the newsletter',
    to: '/newsletter',
  },
  profile: {
    heading: 'Create your founder profile',
    body: 'Claim your profile, collect upvotes and reviews, and build a public track record of everything you ship.',
    label: 'Create your profile',
    to: '/auth',
  },
  browse: {
    heading: 'See what founders shipped this week',
    body: 'Browse the newest launches on Launch for inspiration, competitive research and launch-page ideas.',
    label: 'Browse recent launches',
    to: '/launches/today',
  },
};

interface Props {
  variant?: Variant;
  compact?: boolean;
}

export const BlogCTA = ({ variant = 'launch', compact = false }: Props) => {
  const c = COPY[variant];

  if (compact) {
    return (
      <aside className="not-prose my-8 rounded-xl border border-border bg-muted/30 p-5">
        <p className="font-reckless text-lg mb-1">{c.heading}</p>
        <p className="text-sm text-muted-foreground mb-4">{c.body}</p>
        <Button asChild size="sm">
          <Link to={c.to}>
            {c.label} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </aside>
    );
  }

  return (
    <section className="not-prose mt-16 p-8 rounded-xl bg-muted/40 text-center">
      <h2 className="font-reckless text-2xl mb-3">{c.heading}</h2>
      <p className="text-muted-foreground mb-5 max-w-xl mx-auto">{c.body}</p>
      <Button asChild size="lg">
        <Link to={c.to}>{c.label}</Link>
      </Button>
    </section>
  );
};

export default BlogCTA;
