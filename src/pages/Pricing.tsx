import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Calendar, Zap, RefreshCw, Rocket } from 'lucide-react';
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
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.id === 'free' && <Rocket className="h-6 w-6 text-primary" />}
                  {plan.id === 'join' && <Calendar className="h-6 w-6 text-primary" />}
                  {plan.id === 'skip' && <Zap className="h-6 w-6 text-primary" />}
                  {plan.id === 'relaunch' && <RefreshCw className="h-6 w-6 text-primary" />}
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
                        <span className="text-sm">Email notification to all subscribers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Social media promotion</span>
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
          <p className="text-muted-foreground mt-4">
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
