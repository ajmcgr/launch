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
    { value: "70K+", label: "Monthly Active Users" },
    { value: "28K+", label: "Weekly Active Users" },
    { value: "500K+", label: "Product Views Monthly" },
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
            src="https://www.youtube.com/embed/aPOlq3HvInA?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3"
            title="Launch Pass Overview"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="container mx-auto px-4 max-w-3xl py-12 md:py-16">
          {/* Hero - Who, What, Why */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Launch Pass</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              For makers who launch often. Replace per-launch fees with one flat rate.
            </p>
          </div>

          {/* Active Pass Notice */}
          {hasActivePass && expiresAt && (
            <div className={`mb-12 p-6 rounded-lg ${cancelAtPeriodEnd ? 'bg-destructive/5 border border-destructive/20' : 'bg-primary/5 border border-primary/20'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className={`flex items-center gap-2 font-medium mb-1 ${cancelAtPeriodEnd ? 'text-destructive' : 'text-primary'}`}>
                    {cancelAtPeriodEnd ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span>Subscription ending</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
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
            </div>
          )}

          {/* Two Column Layout: Stats & Features */}
          <div className="mb-12 grid md:grid-cols-2 gap-8 md:gap-12">
            {/* The Launch community in numbers */}
            <div>
              <h2 className="text-xl font-semibold mb-6 text-center md:text-left">The Launch community in numbers</h2>
              <div className="flex flex-col gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included */}
            <div>
              <h2 className="text-xl font-semibold mb-6 text-center md:text-left">What's included with Launch Pass</h2>
              <div className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.title}>
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-12 text-center py-10 border-y border-border">
            <div className="text-5xl md:text-6xl font-bold tracking-tight mb-2">
              $99
              <span className="text-xl font-normal text-muted-foreground"> / year</span>
            </div>
            <p className="text-muted-foreground mb-8">Billed annually. Cancel anytime.</p>
            
            <Button 
              size="lg" 
              className="text-base px-10 py-6"
              onClick={handlePurchase}
              disabled={isLoading || hasActivePass}
            >
              {isLoading ? 'Processing...' : hasActivePass ? 'Already Subscribed' : 'Get Launch Pass →'}
            </Button>
          </div>

          {/* Testimonial */}
          <div className="mb-12">
            <blockquote className="text-center">
              <p className="text-lg md:text-xl leading-relaxed text-foreground/90 mb-6">
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

          {/* Bottom CTA */}
          <div className="mb-12 text-center">
            <Button 
              size="lg" 
              className="text-base px-10 py-6"
              onClick={handlePurchase}
              disabled={isLoading || hasActivePass}
            >
              {isLoading ? 'Processing...' : hasActivePass ? 'Already Subscribed' : 'Get Launch Pass →'}
            </Button>
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
