import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, DollarSign, Quote, ArrowRight, Rocket } from 'lucide-react';

interface SuccessStory {
  product_id: string;
  signups: number | null;
  revenue: number | null;
  testimonial: string | null;
  updated_at: string;
  product_name: string;
  product_slug: string;
  product_tagline: string;
  product_icon: string | null;
}

const SuccessStories = () => {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ signups: 0, revenue: 0, stories: 0 });

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('product_outcomes')
          .select('product_id, signups, revenue, testimonial, updated_at')
          .or('signups.gt.0,revenue.gt.0,testimonial.neq.')
          .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }

        const productIds = data.map((d: any) => d.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('id, name, slug, tagline, icon_url')
          .in('id', productIds)
          .eq('status', 'launched');

        const productMap = new Map((products || []).map((p: any) => [p.id, p]));

        const merged: SuccessStory[] = data
          .filter((d: any) => productMap.has(d.product_id))
          .map((d: any) => {
            const p = productMap.get(d.product_id);
            return {
              ...d,
              product_name: p.name,
              product_slug: p.slug,
              product_tagline: p.tagline,
              product_icon: p.icon_url,
            };
          });

        setStories(merged);
        setTotals({
          signups: merged.reduce((sum, s) => sum + (s.signups || 0), 0),
          revenue: merged.reduce((sum, s) => sum + (s.revenue || 0), 0),
          stories: merged.length,
        });
      } catch (err) {
        console.error('Error fetching success stories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Success Stories — Launch',
    description: 'Real results from makers who launched on Launch. See the signups, revenue, and traction they achieved.',
    url: 'https://trylaunch.ai/success-stories',
  };

  return (
    <>
      <Helmet>
        <title>Success Stories — Real Results from Launches | Launch</title>
        <meta name="description" content="See how makers achieved real signups, revenue, and traction by launching on Launch. Browse verified outcomes and testimonials." />
        <link rel="canonical" href="https://trylaunch.ai/success-stories" />
      </Helmet>
      <JsonLd data={jsonLd} />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-3 font-['Reckless']">
            Real Results from Real Launches
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Makers share what happened after they launched. Signups, revenue, first customers — the outcomes that matter.
          </p>
        </div>

        {/* Aggregate Stats */}
        {totals.stories > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{totals.signups.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Signups</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <DollarSign className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">${totals.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{totals.stories}</p>
                <p className="text-sm text-muted-foreground">Success Stories</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stories List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3 mb-4" />
                  <div className="h-16 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No success stories yet</h2>
              <p className="text-muted-foreground mb-6">
                Be the first! Launch your product and share your results.
              </p>
              <Button asChild>
                <Link to="/submit">Launch Your Product</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {stories.map((story) => (
              <Card key={story.product_id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {story.product_icon && (
                      <img
                        src={story.product_icon}
                        alt={story.product_name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/launch/${story.product_slug}`}
                          className="font-semibold text-lg hover:text-primary transition-colors"
                        >
                          {story.product_name}
                        </Link>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{story.product_tagline}</p>

                      <div className="flex flex-wrap gap-3 mb-3">
                        {story.signups && story.signups > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {story.signups} signups
                          </Badge>
                        )}
                        {story.revenue && story.revenue > 0 && (
                          <Badge variant="secondary" className="gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${story.revenue.toLocaleString()} revenue
                          </Badge>
                        )}
                      </div>

                      {story.testimonial && (
                        <div className="bg-muted/50 rounded-lg p-4 border border-border">
                          <Quote className="h-4 w-4 text-muted-foreground mb-1" />
                          <p className="text-sm italic text-foreground">{story.testimonial}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 text-center">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-10">
              <h2 className="text-2xl font-bold mb-2 font-['Reckless']">Want results like these?</h2>
              <p className="text-muted-foreground mb-6">
                Launch your product and reach thousands of builders, makers, and early adopters.
              </p>
              <Button asChild size="lg" className="gap-2">
                <Link to="/submit">
                  Launch Your Product <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SuccessStories;
