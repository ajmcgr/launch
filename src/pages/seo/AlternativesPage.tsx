import { useParams, Navigate, Link } from 'react-router-dom';
import { alternativesPagesBySlug } from '@/lib/seo/alternativesPages';
import { SeoHead } from '@/components/seo/SeoHead';
import {
  SeoHero,
  SeoWhoFor,
  SeoComparisonTable,
  SeoToolList,
  SeoFaq,
  SeoCta,
  SeoRelated,
} from '@/components/seo/SeoPrimitives';

const AlternativesPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? alternativesPagesBySlug[slug] : undefined;
  if (!page) return <Navigate to="/" replace />;

  const path = `/alternatives/${page.slug}`;

  return (
    <div className="min-h-screen bg-background py-12">
      <SeoHead
        title={page.title}
        description={page.metaDescription}
        path={path}
        faqs={page.faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Alternatives', path: '/alternatives/product-hunt' },
          { name: page.h1, path },
        ]}
        itemList={page.items.map((i) => ({
          name: i.name,
          url: i.internal ? `https://trylaunch.ai${i.internal}` : i.url || `https://trylaunch.ai${path}`,
        }))}
      />

      <article className="container mx-auto px-4 max-w-3xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">← Home</Link>
        </nav>
        <SeoHero h1={page.h1} intro={page.intro} />
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-3">Why look for {page.targetTool} alternatives?</h2>
          <p className="leading-relaxed text-muted-foreground">{page.whyAlternatives}</p>
        </section>
        <SeoWhoFor text={page.whoIsItFor} />
        {page.table && <SeoComparisonTable table={page.table} />}
        <SeoToolList items={page.items} heading={`${page.targetTool} alternatives, ranked`} />
        <SeoCta heading={page.ctaHeading} body={page.ctaBody} primary={page.ctaPrimary} />
        <SeoFaq items={page.faqs} />
        <SeoRelated links={page.related} />
      </article>
    </div>
  );
};

export default AlternativesPage;
