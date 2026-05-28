import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, X, Minus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findComparison, comparisons } from '@/lib/comparisons';
import { buildFaqJsonLd } from '@/lib/seoFaq';

const ComparePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const data = slug ? findComparison(slug) : undefined;

  if (!data) {
    return <Navigate to="/compare" replace />;
  }

  const title = `Launch vs ${data.competitor} — Honest Comparison (2026)`;

  const faqJsonLd = buildFaqJsonLd(data.faqs);
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://trylaunch.ai' },
      { '@type': 'ListItem', position: 2, name: 'Compare', item: 'https://trylaunch.ai/compare' },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Launch vs ${data.competitor}`,
        item: `https://trylaunch.ai/compare/${data.slug}`,
      },
    ],
  };

  const renderWinnerCell = (text: string, isWinner: boolean) => (
    <td
      className={`p-3 align-top text-sm ${
        isWinner ? 'font-medium text-foreground' : 'text-muted-foreground'
      }`}
    >
      <div className="flex items-start gap-2">
        {isWinner ? (
          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        ) : (
          <Minus className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
        )}
        <span>{text}</span>
      </div>
    </td>
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={data.metaDescription} />
        <link rel="canonical" href={`https://trylaunch.ai/compare/${data.slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={data.metaDescription} />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbsJsonLd)}</script>
      </Helmet>

      <article className="container mx-auto px-4 max-w-3xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/compare" className="hover:text-foreground">
            ← All comparisons
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-3">
            Launch vs{' '}
            <a
              href={data.competitorUrl}
              target="_blank"
              rel="noopener"
              className="hover:underline decoration-primary underline-offset-4"
            >
              {data.competitor}
            </a>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {data.oneLiner}
          </p>
        </header>

        <section className="mb-10">
          <p className="leading-relaxed">{data.summary}</p>
        </section>

        <section className="mb-10 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/30 p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Launch is for
            </h3>
            <p className="text-sm leading-relaxed">{data.whoIsItFor.launch}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              {data.competitor} is for
            </h3>
            <p className="text-sm leading-relaxed">
              {data.whoIsItFor.competitor}
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Feature comparison</h2>
          <div className="overflow-x-auto rounded-xl bg-muted/20">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-3 font-semibold">Feature</th>
                  <th className="p-3 font-semibold">Launch</th>
                  <th className="p-3 font-semibold">
                    <a
                      href={data.competitorUrl}
                      target="_blank"
                      rel="noopener"
                      className="hover:underline decoration-primary underline-offset-4"
                    >
                      {data.competitor}
                    </a>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.feature} className="border-t border-border/40">
                    <td className="p-3 font-medium align-top">{row.feature}</td>
                    {renderWinnerCell(
                      row.launch,
                      row.winner === 'launch' || row.winner === 'tie',
                    )}
                    {renderWinnerCell(
                      row.competitor,
                      row.winner === 'competitor' || row.winner === 'tie',
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/30 p-5">
              <h3 className="font-semibold mb-2">Launch</h3>
              <p className="text-sm text-muted-foreground">{data.pricing.launch}</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-5">
              <h3 className="font-semibold mb-2">
                <a
                  href={data.competitorUrl}
                  target="_blank"
                  rel="noopener"
                  className="hover:underline decoration-primary underline-offset-4"
                >
                  {data.competitor}
                </a>
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.pricing.competitor}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-xl font-bold mb-3">The verdict</h2>
          <p className="leading-relaxed">{data.verdict}</p>
          <Button asChild className="mt-4 gap-2">
            <Link to="/submit">
              Launch your product on Launch <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {data.faqs.map((f) => (
              <div key={f.question}>
                <h3 className="font-semibold mb-1">{f.question}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-10 border-t border-border/40">
          <h2 className="text-xl font-bold mb-4">Other comparisons</h2>
          <ul className="space-y-2">
            {comparisons
              .filter((c) => c.slug !== data.slug)
              .map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/compare/${c.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Launch vs {c.competitor} →
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </div>
  );
};

export default ComparePage;
