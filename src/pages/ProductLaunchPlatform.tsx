import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Rocket, Calendar, Share2, Mail, Award, BarChart, ArrowRight, CheckCircle } from 'lucide-react';

const ProductLaunchPlatform = () => {
  const steps = [
    {
      icon: Rocket,
      step: '1',
      title: 'Submit Your Product',
      description: 'Fill out a simple form with your product details, screenshots, and description.',
    },
    {
      icon: Calendar,
      step: '2',
      title: 'Choose Your Launch Date',
      description: 'Pick the perfect day to launch. Pro users can schedule up to 30 days ahead.',
    },
    {
      icon: Share2,
      step: '3',
      title: 'Get Promoted',
      description: 'Your product gets featured on our homepage, social media, and newsletter.',
    },
    {
      icon: Award,
      step: '4',
      title: 'Win & Grow',
      description: 'Compete for daily, weekly, and monthly awards. Build your audience.',
    },
  ];

  const benefits = [
    'Reach thousands of potential early adopters',
    'Get valuable feedback from real users',
    'Build social proof with votes and comments',
    'Earn dofollow backlinks for SEO',
    'Connect with other founders in the community',
    'Track performance with built-in analytics',
  ];

  return (
    <>
      <Helmet>
        <title>Product Launch Platform - Launch Your Startup | Launch</title>
        <meta 
          name="description" 
          content="Launch is the product launch platform for AI startups and SaaS products. Submit your product, reach early adopters, and grow your user base. Free to get started." 
        />
        <meta name="keywords" content="product launch platform, startup launch, saas launch platform, product discovery, ai product launch" />
        <link rel="canonical" href="https://trylaunch.ai/product-launch-platform" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Product Launch Platform - Launch Your Startup | Launch" />
        <meta property="og:description" content="Launch is the product launch platform for AI startups and SaaS products. Submit your product, reach early adopters, and grow your user base." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trylaunch.ai/product-launch-platform" />
        <meta property="og:image" content="https://trylaunch.ai/social-card.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Product Launch Platform - Launch Your Startup | Launch" />
        <meta name="twitter:description" content="Launch is the product launch platform for AI startups and SaaS products." />
        <meta name="twitter:image" content="https://trylaunch.ai/social-card.png" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              The Product Launch Platform Built for Founders
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Launch is where founders discover, share, and vote on the best new products. 
              Get your product in front of thousands of engaged users.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link to="/submit">
                  Launch Your Product
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-4">
              How Launch Works
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              From submission to success in four simple steps
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step) => (
                <Card key={step.title} className="border-border relative">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div className="absolute top-4 right-4 text-2xl font-bold text-muted-foreground/30">
                      {step.step}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Why Launch on Our Platform?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Launch gives your product the visibility it deserves. Our community of founders, 
                  developers, and early adopters is actively looking for the next great tool.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Platform Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <BarChart className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Analytics Dashboard</p>
                      <p className="text-sm text-muted-foreground">Track views, clicks, and engagement</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Newsletter Feature</p>
                      <p className="text-sm text-muted-foreground">Reach 2K+ subscribers directly</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Share2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Social Promotion</p>
                      <p className="text-sm text-muted-foreground">Featured on X and LinkedIn</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start with a free listing. Upgrade anytime to unlock premium features like 
              social promotion, newsletter features, and priority scheduling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link to="/pricing">See All Plans</Link>
              </Button>
              <Button asChild>
                <Link to="/submit">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">Launch Your Product Today</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Join the growing community of founders who trust Launch to get their products discovered.
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

export default ProductLaunchPlatform;
