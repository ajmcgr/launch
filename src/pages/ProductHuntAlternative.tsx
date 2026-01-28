import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Users, Trophy, Zap, Heart, ArrowRight } from 'lucide-react';

const ProductHuntAlternative = () => {
  const features = [
    {
      icon: Users,
      title: 'Community-First Approach',
      description: 'Our engaged community of founders and early adopters actively discovers and supports new products.',
    },
    {
      icon: Trophy,
      title: 'Fair Competition',
      description: 'Every product gets a fair chance to shine. No pay-to-win, no algorithm manipulation.',
    },
    {
      icon: Zap,
      title: 'AI-Focused Audience',
      description: 'Reach users specifically interested in AI tools, SaaS products, and innovative solutions.',
    },
    {
      icon: Heart,
      title: 'Founder-Friendly',
      description: 'Built by founders, for founders. We understand the challenges of launching a product.',
    },
  ];

  const comparisons = [
    { feature: 'Free product listing', launch: true, others: 'Often paid or waitlisted' },
    { feature: 'Choose your launch date', launch: true, others: 'Limited availability' },
    { feature: 'Social media promotion', launch: true, others: 'Extra cost' },
    { feature: 'Newsletter feature', launch: true, others: 'Premium only' },
    { feature: 'Dofollow backlinks', launch: true, others: 'Nofollow links' },
    { feature: 'AI-focused audience', launch: true, others: 'General audience' },
  ];

  return (
    <>
      <Helmet>
        <title>Product Hunt Alternative - Launch Your Product on Launch</title>
        <meta 
          name="description" 
          content="Looking for a Product Hunt alternative? Launch is a community-driven platform for founders to launch AI products and reach engaged early adopters. Free listings, fair competition." 
        />
        <meta name="keywords" content="product hunt alternative, launch platform, product launch, ai products, saas launch" />
        <link rel="canonical" href="https://trylaunch.ai/product-hunt-alternative" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Product Hunt Alternative - Launch Your Product on Launch" />
        <meta property="og:description" content="Looking for a Product Hunt alternative? Launch is a community-driven platform for founders to launch AI products and reach engaged early adopters." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trylaunch.ai/product-hunt-alternative" />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Product Hunt Alternative - Launch Your Product on Launch" />
        <meta name="twitter:description" content="Looking for a Product Hunt alternative? Launch is a community-driven platform for founders to launch AI products." />
        <meta name="twitter:image" content="https://trylaunch.ai/social-card.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              The Best Product Hunt Alternative for AI Founders
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Launch your product to a community of engaged founders and early adopters. 
              No waitlists, no algorithms, just real users discovering great products.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/submit">
                  Launch Your Product Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/products">Browse Products</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why Switch Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Founders Choose Launch
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border">
                  <CardContent className="p-6">
                    <feature.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-4">
              Launch vs Other Platforms
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              See how Launch compares to traditional product launch platforms
            </p>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold text-primary">Launch</th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">Others</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisons.map((row, index) => (
                      <tr key={row.feature} className={index !== comparisons.length - 1 ? 'border-b border-border' : ''}>
                        <td className="p-4">{row.feature}</td>
                        <td className="p-4 text-center">
                          {row.launch === true ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            row.launch
                          )}
                        </td>
                        <td className="p-4 text-center text-muted-foreground text-sm">
                          {row.others}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary">70K+</p>
                <p className="text-muted-foreground">Monthly Impressions</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary">2K+</p>
                <p className="text-muted-foreground">Newsletter Subscribers</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary">25%</p>
                <p className="text-muted-foreground">Email Open Rate</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Launch?</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join hundreds of founders who've successfully launched their products on Launch. 
              Get started in minutes, completely free.
            </p>
            <Button asChild size="lg">
              <Link to="/submit">
                Submit Your Product
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default ProductHuntAlternative;
