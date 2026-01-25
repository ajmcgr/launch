import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lock, Rocket, RefreshCw, Zap, Calendar, TrendingUp, Mail, Award } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import stripeLogo from '@/assets/stripe-logo.png';
import { Testimonials } from '@/components/Testimonials';

const FEATURE_CONFIG = [
  { key: 'listing', label: 'Homepage listing', icon: TrendingUp },
  { key: 'socialPromotion', label: 'Social media promotion', icon: Zap },
  { key: 'newsletter', label: 'Newsletter feature', icon: Mail },
  { key: 'chooseDate', label: 'Choose launch date', icon: Calendar },
  { key: 'badge', label: 'Verified badge', icon: Award },
] as const;

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Launch Your Product</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get your product in front of thousands of technologists, marketers and founders
          </p>
        </div>

        {/* Social proof banner */}
        <div className="bg-muted/50 rounded-lg p-4 text-center max-w-2xl mx-auto mb-8">
          <p className="text-sm font-medium">
            <span className="text-primary">87% of top launches</span> use paid promotion plans
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Get 5-10x more visibility with social & newsletter promotion
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative hover:shadow-lg transition-shadow ${
                plan.highlight ? 'border-primary shadow-md ring-2 ring-primary' : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                    {plan.badge}
                  </div>
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-sm">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  ${plan.price}<span className="text-sm font-normal text-muted-foreground"> USD</span>
                </div>

                <ul className="space-y-2">
                  {FEATURE_CONFIG.map(({ key, label }) => {
                    const hasFeature = plan.features[key as keyof typeof plan.features];
                    return (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        {hasFeature ? (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <span className={!hasFeature ? 'text-muted-foreground/60' : ''}>
                          {label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Value callout */}
                {plan.id === 'skip' && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">70K+ impressions</span> • Best visibility
                    </p>
                  </div>
                )}
                {plan.id === 'join' && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">5x more views</span> than free
                    </p>
                  </div>
                )}

                <Button 
                  asChild
                  className="w-full" 
                  size="lg"
                  variant={plan.highlight ? 'default' : 'outline'}
                >
                  <Link to={plan.id === 'free' ? '/submit?plan=free' : '/submit'}>
                    {plan.price === 0 ? 'Start Free' : 'Get Started'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Maximum 1 launch per week across all plans
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
          <Lock className="h-4 w-4" />
          <span>Payments secured by</span>
          <img src={stripeLogo} alt="Stripe" className="h-6" />
        </div>

        <Testimonials 
          variant="compact"
          title="What Makers Are Saying"
          subtitle="Join hundreds of founders who've launched successfully on Launch"
          maxItems={2}
        />

        {/* Pass Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Launch Pass</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Unlimited launches for a full year — one simple price
            </p>
          </div>

          <Card className="max-w-lg mx-auto relative hover:shadow-lg transition-shadow border-primary shadow-md">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Best for Power Launchers
            </Badge>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Pass</CardTitle>
              <CardDescription>12 months of unlimited access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-5xl font-bold">
                  $99<span className="text-base font-normal text-muted-foreground"> / year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">One-time payment</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Rocket className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Unlimited Launches</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Unlimited Relaunches</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Future Features</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">12 Months Access</span>
                </div>
              </div>

              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Skip the queue on all your launches</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Perfect for agencies & serial builders</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">All future non-advertising features included</span>
                </li>
              </ul>

              <Button asChild className="w-full" size="lg">
                <Link to="/pass">Get Your Pass</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Advertising Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Advertising</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Reach a highly engaged audience of builders and AI early adopters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">Website Placement</CardTitle>
                <CardDescription>Sponsored listing on the Launch homepage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  $250<span className="text-base font-normal text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sponsored listing on Launch homepage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Visible to thousands of founders & builders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Clearly labelled. No impact on rankings.</span>
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link to="/advertise">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">Newsletter Sponsorship</CardTitle>
                <CardDescription>Featured sponsor in our weekly newsletter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  $200<span className="text-base font-normal text-muted-foreground"> / issue</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Featured sponsor section in one weekly newsletter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sent to ~2,000 founders, makers & early-stage teams</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">25% email open rate</span>
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg" variant="outline">
                  <Link to="/advertise">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative hover:shadow-lg transition-shadow border-primary shadow-md">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Best Value
              </Badge>
              <CardHeader>
                <CardTitle className="text-xl">Combined Package</CardTitle>
                <CardDescription>Website + Newsletter bundle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  $400<span className="text-base font-normal text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Homepage sponsorship (1 month)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">One newsletter sponsorship per month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Save $50/month with bundle</span>
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg">
                  <Link to="/advertise">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-12">
          <Lock className="h-4 w-4" />
          <span>Payments secured by</span>
          <img src={stripeLogo} alt="Stripe" className="h-6" />
        </div>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            All plans include support from our team. Questions?{' '}
            <a href="mailto:alex@trylaunch.ai" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
