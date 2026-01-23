import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Lock, Rocket, RefreshCw, Zap, Calendar, AlertCircle, TrendingUp, Users, Star, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePass } from '@/hooks/use-pass';
import { useQueryClient } from '@tanstack/react-query';
import stripeLogo from '@/assets/stripe-logo.png';
import yogeshAvatar from '@/assets/yogesh-avatar.jpg';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Pass = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: passData, isLoading: passLoading, refetch } = usePass(userId);
  
  const hasActivePass = passData?.hasActivePass ?? false;
  const expiresAt = passData?.expiresAt;
  const cancelAtPeriodEnd = passData?.cancelAtPeriodEnd ?? false;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id);
      if (session?.user?.id) {
        refetch();
      }
    });

    return () => subscription.unsubscribe();
  }, [refetch]);

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to purchase the Pass.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: 'annual_access' },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your subscription will end at the current billing period.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['pass', userId] });
      refetch();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    
    try {
      const { error } = await supabase.functions.invoke('reactivate-subscription');

      if (error) throw error;

      toast({
        title: "Subscription reactivated",
        description: "Your subscription will continue automatically.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['pass', userId] });
      refetch();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const features = [
    {
      icon: Rocket,
      title: "Unlimited Launches",
      description: "Launch as many products as you want throughout the year"
    },
    {
      icon: RefreshCw,
      title: "Unlimited Relaunches",
      description: "Relaunch products with updates at no extra cost"
    },
    {
      icon: Zap,
      title: "All Future Features",
      description: "Access to any new non-advertising features we add"
    },
    {
      icon: Calendar,
      title: "Auto-Renewal",
      description: "Subscription renews automatically each year. Cancel anytime."
    }
  ];

  const includedItems = [
    "New product launches",
    "Product relaunches",
    "Skip-the-queue launches",
    "All future non-advertising features",
    "Priority support"
  ];

  const stats = [
    { icon: Users, value: "16,000+", label: "Active Users" },
    { icon: TrendingUp, value: "$25K+", label: "Monthly Revenue" },
    { icon: Star, value: "150+", label: "Sponsors Served" },
  ];

  if (passLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Launch Pass - Unlimited Product Launches for $99/year</title>
        <meta name="description" content="For indie hackers who launch often. Replace per-launch fees with one flat rate. Subscribe to Launch Pass for unlimited product launches at $99/year." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Video - Full Width Edge to Edge */}
        <div className="w-full aspect-video">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/aPOlq3HvInA"
            title="Launch Pass Overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="container mx-auto px-4 max-w-4xl py-8 md:py-12">
          {/* Hero - Who, What, Why */}
          <div className="text-center mb-6">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Launch Pass</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              For indie hackers who launch often. Replace per-launch fees with one flat rate. Lock in before prices go up.
            </p>
          </div>


          {/* Why Launch with Launch? */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">Why Launch with Launch?</h2>
          </div>

          {/* Active Pass Notice */}
          {hasActivePass && expiresAt && (
            <Card className={`mb-8 ${cancelAtPeriodEnd ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5'}`}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className={`flex items-center gap-2 font-medium mb-2 ${cancelAtPeriodEnd ? 'text-destructive' : 'text-primary'}`}>
                      {cancelAtPeriodEnd ? (
                        <>
                          <AlertCircle className="h-5 w-5" />
                          <span>Subscription ending</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5" />
                          <span>Active subscription</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {cancelAtPeriodEnd 
                        ? `Your access ends on ${new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        : `Renews on ${new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                      }
                    </p>
                  </div>
                  
                  {cancelAtPeriodEnd ? (
                    <Button 
                      variant="outline"
                      onClick={handleReactivate}
                      disabled={isReactivating}
                    >
                      {isReactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will remain active until {new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. 
                            After that, you'll return to standard pricing for launches.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats - Enhanced Visual */}
          <div className="mb-10">
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="text-center p-4 md:p-6 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/50"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 mb-3">
                    <stat.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="mb-10 p-6 md:p-8 rounded-xl bg-gradient-to-br from-muted/40 to-transparent border border-border/50">
            <div className="flex flex-col md:flex-row gap-5 items-start">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20 ring-offset-2 ring-offset-background flex-shrink-0">
                <AvatarImage src={yogeshAvatar} alt="Yogesh" />
                <AvatarFallback>YA</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-base md:text-lg mb-4 leading-relaxed text-foreground/90">
                  "Launched Supalytics on Launch and got instant traffic. The community here actually engages with products — not just scrolls past. Best decision for getting early users."
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Yogesh</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">Supalytics</span>
                  <a 
                    href="https://x.com/yogesharc" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1 ml-1"
                  >
                    @yogesharc
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Card - Enhanced CTA */}
          <Card className="mb-12 border-2 border-primary">
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col items-center text-center gap-6">
                <div>
                  <div className="text-5xl md:text-6xl font-bold mb-2">
                    $99
                    <span className="text-lg font-normal text-muted-foreground"> / year</span>
                  </div>
                  <p className="text-muted-foreground">Billed annually. Cancel anytime.</p>
                </div>
                
                <Button 
                  size="lg" 
                  className="text-lg px-12 py-6 w-full md:w-auto"
                  onClick={handlePurchase}
                  disabled={isLoading || hasActivePass}
                >
                  {isLoading ? 'Processing...' : hasActivePass ? 'Already Subscribed' : 'Get Launch Pass Now →'}
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Join 200+ indie hackers already launching unlimited
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* What's Included */}
          <div className="mb-12">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-lg">What's included</h3>
                <ul className="space-y-3">
                  {includedItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="year-start" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-sm">
                  When does my year start?
                </AccordionTrigger>
                <AccordionContent>
                  Your 12-month access period begins immediately upon purchase.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="after-12-months" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-sm">
                  What happens after 12 months?
                </AccordionTrigger>
                <AccordionContent>
                  Your subscription automatically renews each year. You'll receive an email reminder 7 days before renewal. You can cancel anytime from your account settings.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-sm">
                  How do I cancel?
                </AccordionTrigger>
                <AccordionContent>
                  You can cancel your subscription anytime from this page or your account settings. You'll continue to have access until the end of your current billing period.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="refund" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-sm">
                  Can I get a refund?
                </AccordionTrigger>
                <AccordionContent>
                  Pass purchases are non-refundable. If you have concerns, contact us before purchasing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="advertising" className="border rounded-lg px-6">
                <AccordionTrigger className="text-left text-sm">
                  Does this include advertising?
                </AccordionTrigger>
                <AccordionContent>
                  No. Advertising, sponsorships, and featured placements are not included and are priced separately.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Stripe Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Payments secured by</span>
            <img src={stripeLogo} alt="Stripe" className="h-6" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Pass;
