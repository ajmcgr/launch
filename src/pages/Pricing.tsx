import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import { toast } from 'sonner';

const Pricing = () => {
  const handleSelectPlan = async (planId: string) => {
    toast.info('Stripe integration will be implemented');
    // In production: Create Stripe checkout session
  };

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Launch Your Product</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan to get your product in front of thousands of founders and tech enthusiasts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id} className="relative hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-bold">
                  ${plan.price}
                  <span className="text-base font-normal text-muted-foreground ml-1">USD</span>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-sm">Featured on homepage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-sm">Email to subscribers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary mt-0.5" />
                    <span className="text-sm">Social media promotion</span>
                  </li>
                  {plan.id === 'skip' && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span className="text-sm font-semibold">Choose your launch date</span>
                    </li>
                  )}
                  {plan.id === 'relaunch' && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5" />
                      <span className="text-sm font-semibold">Bring back past launches</span>
                    </li>
                  )}
                </ul>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  Get Started
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
