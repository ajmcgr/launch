import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { freeTools, TOOL_CATEGORIES } from '@/lib/freeTools';

const Tools = () => {
  const [active, setActive] = useState<string>('All');
  const filtered = active === 'All' ? freeTools : freeTools.filter((t) => t.category === active);

  return (
    <>
      <Helmet>
        <title>Free Marketing Tools for Makers — Launch</title>
        <meta
          name="description"
          content="Free, no-signup marketing tools for makers and founders: tagline generators, launch tweet writers, SEO helpers, outreach templates, and more."
        />
        <link rel="canonical" href="https://trylaunch.ai/tools" />
        <meta property="og:title" content="Free Marketing Tools for Makers — Launch" />
        <meta property="og:description" content="20+ free tools to help you ship and market your product. No signup required." />
        <meta property="og:url" content="https://trylaunch.ai/tools" />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-7xl text-center">
            <h1 className="text-4xl md:text-5xl font-reckless font-bold mb-4">
              Free marketing tools for makers
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {freeTools.length}+ free tools to help you ship, launch, and grow. Always free • No signup required.
            </p>
          </div>
        </section>

        <section className="pb-8">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap gap-2 justify-center">
              {['All', ...TOOL_CATEGORIES].map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={active === cat ? 'default' : 'outline'}
                  onClick={() => setActive(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((tool) => (
                <Link key={tool.slug} to={`/tools/${tool.slug}`} className="group">
                  <Card className="h-full transition-colors group-hover:border-primary/60">
                    <CardContent className="p-5 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {tool.category}
                      </div>
                      <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {tool.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">{tool.tagline}</p>
                      <div className="text-sm text-primary pt-1">Try for free →</div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Tools;
