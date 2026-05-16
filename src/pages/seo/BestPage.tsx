import { useParams, Navigate, Link } from 'react-router-dom';
import { bestPagesBySlug } from '@/lib/seo/bestPages';
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

const BestPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? bestPagesBySlug[slug] : undefined;
  if (!page) return <Navigate to="/" replace />;

  const path = `/best/${page.slug}`;

  return (
    <div className="min-h-screen bg-background py-12">
      <SeoHead
        title={page.title}
        description={page.metaDescription}
        path={path}
        faqs={page.faqs}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Best', path: '/best/launch-platforms' },
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
        <SeoWhoFor text={page.whoIsItFor} />
        {page.table && <SeoComparisonTable table={page.table} />}
        <SeoToolList items={page.items} />
        <SeoCta heading={page.ctaHeading} body={page.ctaBody} primary={page.ctaPrimary} />
        <SeoFaq items={page.faqs} />
        <SeoRelated links={page.related} />
      </article>
    </div>
  );
};

export default BestPage;
