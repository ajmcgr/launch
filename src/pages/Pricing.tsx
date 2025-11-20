import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Calendar, Zap, RefreshCw } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Launch Your Product</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
            Get your product in front of thousands of founders and tech enthusiasts
          </p>
          <div className="bg-muted/50 border rounded-lg p-6 max-w-3xl mx-auto">
            <h2 className="font-semibold text-lg mb-3">How Our Launch Queue Works</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center text-center">
                <Calendar className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium">Join the Line</p>
                <p className="text-muted-foreground">Auto-scheduled 7+ days out</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <Zap className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium">Launch</p>
                <p className="text-muted-foreground">Pick any date in next 7 days</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <RefreshCw className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium">Relaunch</p>
                <p className="text-muted-foreground">Scheduled 30+ days out</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Maximum 100 launches per day across all plans
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  ${plan.price}
                  <span className="text-base font-normal text-muted-foreground ml-1">USD</span>
                </div>

                {plan.id === 'join' && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">🗓️ Scheduling</p>
                    <p className="text-muted-foreground">
                      Automatically assigned to the first available date more than 7 days from today
                    </p>
                  </div>
                )}

                {plan.id === 'skip' && (
                  <div className="bg-primary/10 rounded-lg p-3 text-sm border border-primary/20">
                    <p className="font-medium mb-1">⚡ Priority Scheduling</p>
                    <p className="text-muted-foreground">
                      Choose any available date within the next 7 days for maximum visibility
                    </p>
                  </div>
                )}

                {plan.id === 'relaunch' && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <p className="font-medium mb-1">🔄 Relaunch Window</p>
                    <p className="text-muted-foreground">
                      Automatically assigned to first available date more than 30 days out (prevents frequent relaunches)
                    </p>
                  </div>
                )}

                <ul className="space-y-3">
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
                </ul>

                <Button 
                  asChild
                  className="w-full" 
                  size="lg"
                  variant={plan.id === 'skip' ? 'default' : 'outline'}
                >
                  <Link to="/submit">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
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
