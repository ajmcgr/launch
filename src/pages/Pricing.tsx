import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lock, Rocket, RefreshCw, Zap, Calendar, TrendingUp, Mail, Award } from 'lucide-react';
import { PRICING_PLANS } from '@/lib/constants';
import stripeLogo from '@/assets/stripe-logo.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import jakeAvatar from '@/assets/jake-avatar.jpg';
import yogeshAvatar from '@/assets/yogesh-avatar.jpg';

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


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {PRICING_PLANS.filter(plan => plan.id !== 'relaunch').map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative hover:shadow-lg transition-shadow ${
                plan.highlight ? 'border-primary shadow-md' : ''
              }`}
            >
              {plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {plan.badge}
                </Badge>
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

          {/* Pass Card */}
          <Card className="relative hover:shadow-lg transition-shadow border-primary shadow-md">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Best Value
            </Badge>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Pass</CardTitle>
              <CardDescription className="text-sm">Unlimited launches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">
                $99<span className="text-sm font-normal text-muted-foreground"> / year</span>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Unlimited launches</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Unlimited relaunches</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>Skip the queue</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>All future features</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>12 months access</span>
                </li>
              </ul>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Save 60%+</span> vs per-launch pricing
                </p>
              </div>

              <Button asChild className="w-full" size="lg">
                <Link to="/pass">Get Pass</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-muted-foreground">
            Maximum 1 launch per week across all plans
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
          <Lock className="h-4 w-4" />
          <span>Payments secured by</span>
          <img src={stripeLogo} alt="Stripe" className="h-6" />
        </div>

        {/* Testimonials */}
        <div className="mt-16 max-w-3xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-center mb-8">What Makers Are Saying</h2>
          
          {/* Jake's Testimonial */}
          <blockquote className="text-center">
            <p className="text-sm md:text-base leading-relaxed text-foreground/90 mb-4">
              "AdGenerator got great visibility from launching here. The engaged audience helped us get our first paying customers fast."
            </p>
            <footer className="flex items-center justify-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={jakeAvatar} alt="Jake" />
                <AvatarFallback>JH</AvatarFallback>
              </Avatar>
              <div className="text-sm text-left">
                <div className="font-medium">Jake</div>
                <div className="text-muted-foreground">
                  AdGenerator · <a 
                    href="https://x.com/jakeh2792" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >@jakeh2792</a>
                </div>
              </div>
            </footer>
          </blockquote>

          {/* Yogesh's Testimonial */}
          <blockquote className="text-center">
            <p className="text-sm md:text-base leading-relaxed text-foreground/90 mb-4">
              "Launched Supalytics on Launch and got instant traffic. The community here actually engages with products — not just scrolls past. Best decision for getting early users."
            </p>
            <footer className="flex items-center justify-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={yogeshAvatar} alt="Yogesh" />
                <AvatarFallback>YA</AvatarFallback>
              </Avatar>
              <div className="text-sm text-left">
                <div className="font-medium">Yogesh</div>
                <div className="text-muted-foreground">
                  Supalytics · <a 
                    href="https://x.com/yogesharc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >@yogesharc</a>
                </div>
              </div>
            </footer>
          </blockquote>
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
