import { useParams, Navigate, Link } from 'react-router-dom';
import { vsPagesBySlug } from '@/lib/seo/vsPages';
import { SeoHead } from '@/components/seo/SeoHead';
import { SeoHero, SeoComparisonTable, SeoFaq, SeoCta, SeoRelated } from '@/components/seo/SeoPrimitives';

const VsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? vsPagesBySlug[slug] : undefined;
  if (!page) return <Navigate to="/" replace />;

  const path = `/vs/${page.slug}`;

  return (
    <div className="min-h-screen bg-background py-12">
      <SeoHead
        title={page.title}
        description={page.metaDescription}
        path={path}
        faqs={page.faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Compare', path: '/compare' },
          { name: page.h1, path },
        ]}
      />

      <article className="container mx-auto px-4 max-w-3xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/compare" className="hover:text-foreground">← All comparisons</Link>
        </nav>
        <SeoHero h1={page.h1} intro={page.oneLiner} />

        <section className="mb-10">
          <p className="leading-relaxed">{page.summary}</p>
        </section>

        <section className="mb-10 grid md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/30 p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              Launch is for
            </h3>
            <p className="text-sm leading-relaxed">{page.whoForLaunch}</p>
          </div>
          <div className="rounded-xl bg-muted/30 p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">
              {page.competitor} is for
            </h3>
            <p className="text-sm leading-relaxed">{page.whoForCompetitor}</p>
          </div>
        </section>

        <SeoComparisonTable table={page.table} />

        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">Pricing</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/30 p-5">
              <h3 className="font-semibold mb-2">Launch</h3>
              <p className="text-sm text-muted-foreground">{page.pricing.launch}</p>
            </div>
            <div className="rounded-xl bg-muted/30 p-5">
              <h3 className="font-semibold mb-2">{page.competitor}</h3>
              <p className="text-sm text-muted-foreground">{page.pricing.competitor}</p>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-xl font-bold mb-3">The verdict</h2>
          <p className="leading-relaxed">{page.verdict}</p>
        </section>

        <SeoCta heading={page.ctaHeading} body={page.ctaBody} primary={page.ctaPrimary} />
        <SeoFaq items={page.faqs} />
        <SeoRelated links={page.related} />
      </article>
    </div>
  );
};

export default VsPage;
