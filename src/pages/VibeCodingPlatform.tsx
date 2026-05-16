import { Helmet } from 'react-helmet-async';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowRight, ExternalLink } from 'lucide-react';
import { getVibeCodingPlatform, vibeCodingPlatforms } from '@/lib/vibeCodingPlatforms';

const VibeCodingPlatform = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const platform = getVibeCodingPlatform(slug);

  if (!platform) return <Navigate to="/" replace />;

  const url = `https://trylaunch.ai/vibe-coding/${platform.slug}`;
  const title = `Launch a ${platform.name} Project — Vibe Coding on Launch`;
  const description = `Built something with ${platform.name}? ${platform.launchPitch}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://trylaunch.ai/social-card.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
              Vibe Coding Platforms
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Launch a {platform.name} project on Launch
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {platform.tagline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/submit">
                  Launch Your Product Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={platform.website} target="_blank" rel="noopener noreferrer">
                  Visit {platform.name}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card>
              <CardContent className="p-8 space-y-4">
                <h2 className="text-2xl font-bold">What is {platform.name}?</h2>
                <p className="text-muted-foreground">{platform.description}</p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Best for:</strong> {platform.bestFor}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Why builders pick {platform.name}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {platform.strengths.map((s) => (
                <div key={s} className="flex items-start gap-3 p-4 rounded-lg bg-muted/40">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card>
              <CardContent className="p-8 space-y-3">
                <h2 className="text-2xl font-bold">How the workflow looks</h2>
                <p className="text-muted-foreground">{platform.workflow}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Shipped with {platform.name}? Launch it.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">{platform.launchPitch}</p>
            <Button asChild size="lg">
              <Link to="/submit">
                Submit Your Product
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="py-12 border-t border-border">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-xl font-bold mb-4">Other vibe coding platforms</h2>
            <div className="flex flex-wrap gap-2">
              {vibeCodingPlatforms
                .filter((p) => p.slug !== platform.slug)
                .map((p) => (
                  <Link
                    key={p.slug}
                    to={`/vibe-coding/${p.slug}`}
                    className="px-3 py-1.5 rounded-md bg-muted hover:bg-muted/70 text-sm transition-colors"
                  >
                    {p.name}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default VibeCodingPlatform;
