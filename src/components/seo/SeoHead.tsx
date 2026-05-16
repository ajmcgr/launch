// Shared head helper for SEO pages: title, meta, canonical, OG, Twitter, JSON-LD.

import { Helmet } from 'react-helmet-async';
import type { FaqItem } from '@/lib/seo/types';

interface SeoHeadProps {
  title: string;
  description: string;
  path: string; // e.g. /best/launch-platforms
  faqs?: FaqItem[];
  breadcrumbs?: Array<{ name: string; path: string }>;
  itemList?: Array<{ name: string; url: string }>;
}

const BASE = 'https://trylaunch.ai';

export const SeoHead = ({ title, description, path, faqs, breadcrumbs, itemList }: SeoHeadProps) => {
  const url = `${BASE}${path}`;
  const jsonLd: Record<string, unknown>[] = [];

  if (faqs && faqs.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (breadcrumbs && breadcrumbs.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: `${BASE}${b.path}`,
      })),
    });
  }

  if (itemList && itemList.length) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: itemList.slice(0, 20).map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: it.url,
      })),
    });
  }

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Launch" />
      <meta property="og:image" content={`${BASE}/social-card.png`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@trylaunchai" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${BASE}/social-card.png`} />
      {jsonLd.map((j, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(j)}
        </script>
      ))}
    </Helmet>
  );
};
