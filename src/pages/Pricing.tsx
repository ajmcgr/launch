import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Lock } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import stripeLogo from '@/assets/stripe-logo.png';
import { Testimonials } from '@/components/Testimonials';

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Launch Your Product</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get your product in front of thousands technologists, marketers and other founders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative hover:shadow-lg transition-shadow ${
                plan.id === 'skip' ? 'border-primary shadow-md' : ''
              }`}
            >
              {plan.id === 'skip' && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  ${plan.price}<span className="text-base font-normal text-muted-foreground"> / USD</span>
                </div>

                <ul className="space-y-3">
                  {plan.id === 'free' ? (
                    <>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Get a Backlink from a DR website to boost your SEO</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Audience of founders, technologists, marketers and more</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Featured on homepage launch day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Permanent product listing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">User voting & comments</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Get a Backlink from a DR website to boost your SEO</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Audience of founders, technologists, marketers and more</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Featured on homepage launch day</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Social media promotion</span>
                      </li>
                      {plan.id === 'skip' && (
                        <li className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">Featured in the weekly Launch email newsletter</span>
                        </li>
                      )}
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Permanent product listing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">User voting & comments</span>
                      </li>
                    </>
                  )}
                </ul>

                <Button 
                  asChild
                  className="w-full" 
                  size="lg"
                  variant={plan.id === 'skip' ? 'default' : 'outline'}
                >
                  <Link to={plan.id === 'free' ? '/submit?plan=free' : '/submit'}>Get Started</Link>
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
