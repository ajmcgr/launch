import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';

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

        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Maximum 1 launch per week across all plans
          </p>
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
                <CardDescription>Prominent display directly above leaderboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  $750<span className="text-base font-normal text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sponsored listing on homepage for 1 month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">2,000+ monthly visitors</span>
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
                <CardDescription>Featured placement in our weekly newsletter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  $500<span className="text-base font-normal text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sponsored section of newsletter for 1 month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">2,000+ subscribers</span>
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
                  $1,000<span className="text-base font-normal text-muted-foreground"> / month</span>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sponsored listing on homepage for 1 month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Sponsored section of newsletter for 1 month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Save $250/month with bundle</span>
                  </li>
                </ul>
                <Button asChild className="w-full" size="lg">
                  <Link to="/advertise">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center">
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
