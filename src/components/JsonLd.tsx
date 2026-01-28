import { Helmet } from 'react-helmet-async';

// Organization schema for the site
export const OrganizationSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Launch",
    "url": "https://trylaunch.ai",
    "logo": "https://trylaunch.ai/images/launch-logo.png",
    "sameAs": [
      "https://x.com/trylaunchai",
      "https://t.me/trylaunch",
      "https://www.reddit.com/r/TryLaunch/",
      "https://instagram.com/trylaunch",
      "https://www.youtube.com/channel/UCiWIdnazQN7JqkioVROrblQ"
    ],
    "description": "Launch is a platform where founders discover and launch AI products. Submit your product, reach early adopters, and grow your user base.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "alex@trylaunch.ai",
      "contactType": "customer service"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// WebSite schema with search action
export const WebSiteSchema = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Launch",
    "url": "https://trylaunch.ai",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://trylaunch.ai/products?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// FAQ schema component
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
}

export const FAQSchema = ({ faqs }: FAQSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Breadcrumb schema component
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export const BreadcrumbSchema = ({ items }: BreadcrumbSchemaProps) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

// Product schema for product detail pages
interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  url: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export const ProductSchema = ({ name, description, image, url, aggregateRating }: ProductSchemaProps) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": name,
    "description": description,
    "image": image,
    "url": url,
    "applicationCategory": "BusinessApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  if (aggregateRating && aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": aggregateRating.ratingValue,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": 5,
      "worstRating": 1
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};
