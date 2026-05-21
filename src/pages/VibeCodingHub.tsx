import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { vibeCodingPlatforms } from '@/lib/vibeCodingPlatforms';

const VibeCodingHub = () => {
  const title = 'Compare Vibe Coding Platforms — AI App Builders (2026)';
  const description =
    'Compare AI-native coding platforms — Lovable, Cursor, Bolt.new, V0, Replit, Claude Code, Codex, Google AI Studio, Rork and more. Find the right tool to ship your next product.';

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Vibe coding platform comparisons',
    itemListElement: vibeCodingPlatforms.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: p.name,
      url: `https://trylaunch.ai/vibe-coding/${p.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://trylaunch.ai/vibe-coding" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-4">Compare vibe coding platforms</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Honest breakdowns of every major AI-native coding platform — what
            they're best for, how the workflow feels, and where to launch what
            you build.
          </p>
        </header>

        <ul className="space-y-3">
          {vibeCodingPlatforms.map((p) => (
            <li key={p.slug}>
              <Link
                to={`/vibe-coding/${p.slug}`}
                className="block rounded-xl bg-muted/30 p-5 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold mb-1">{p.name}</h2>
                    <p className="text-sm text-muted-foreground">{p.tagline}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-16 pt-10 border-t border-border/40">
          <h2 className="text-2xl font-bold mb-4">Why compare?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Vibe coding tools all promise prompt-to-app — but the workflow,
            output, and ceiling vary a lot. Some are full-stack web app
            builders, others live in your terminal or editor, and a few target
            native mobile. Pick the right one for what you're shipping.
          </p>
        </section>
      </div>
    </div>
  );
};

export default VibeCodingHub;
