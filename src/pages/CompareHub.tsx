import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { comparisons } from '@/lib/comparisons';

const CompareHub = () => {
  const title = 'Launch vs Alternatives — Compare Product Launch Platforms (2026)';
  const description =
    'Compare Launch with Product Hunt, BetaList, Peerlist and Uneed. Pricing, dofollow backlinks, verified revenue, ranking systems — the honest breakdown for indie makers.';

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Launch product launch platform comparisons',
    itemListElement: comparisons.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: `Launch vs ${c.competitor}`,
      url: `https://trylaunch.ai/compare/${c.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://trylaunch.ai/compare" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4 max-w-4xl">
        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-4">Launch vs alternatives</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Honest comparisons between Launch and other product launch platforms.
            Pricing, ranking, audience, backlinks — no fluff.
          </p>
        </header>

        <ul className="space-y-3">
          <li>
            <Link
              to="/best/launch-platforms"
              className="block rounded-xl bg-muted/30 p-5 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold mb-1">
                    Best product launch platforms (2026)
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Ranked list of every major launch platform — pricing, audience, SEO value.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </Link>
          </li>
          {comparisons.map((c) => (
            <li key={c.slug}>
              <Link
                to={`/compare/${c.slug}`}
                className="block rounded-xl bg-muted/30 p-5 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold mb-1">
                      Launch vs {c.competitor}
                    </h2>
                    <p className="text-sm text-muted-foreground">{c.oneLiner}</p>
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
            Most makers launch on multiple platforms — that's the smart play.
            Each directory has a different audience, ranking algorithm and SEO
            profile. Use these comparisons to decide where to spend your launch
            energy and which platforms deserve a recurring slot in your
            distribution stack.
          </p>
        </section>
      </div>
    </div>
  );
};

export default CompareHub;
