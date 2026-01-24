import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, X, Eye, Mail, CheckCircle, HelpCircle, Lock, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, addMonths, setMonth, setYear } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Rocket, RefreshCw, Zap, Calendar } from 'lucide-react';
import yogeshAvatar from '@/assets/yogesh-avatar.jpg';
import jakeAvatar from '@/assets/jake-avatar.jpg';
import PopularProductIcons from '@/components/PopularProductIcons';

interface LaunchedProduct {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  iconUrl: string | null;
}

import defaultProductIcon from '@/assets/default-product-icon.png';
import stripeLogo from '@/assets/stripe-logo.png';

type SponsorshipType = 'website' | 'newsletter' | 'combined';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthYearPicker = ({ onSelect }: { onSelect: (date: Date) => void }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const years = Array.from({ length: 3 }, (_, i) => currentYear + i);
  
  const handleMonthClick = (monthIndex: number) => {
    const date = setMonth(setYear(new Date(), selectedYear), monthIndex);
    onSelect(date);
  };
  
  const isDisabled = (monthIndex: number) => {
    if (selectedYear === currentYear && monthIndex < currentMonth) {
      return true;
    }
    return false;
  };
  
  return (
    <div className="space-y-4">
      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-background">
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-2">
        {MONTHS.map((month, index) => (
          <Button
            key={month}
            variant="outline"
            size="sm"
            disabled={isDisabled(index)}
            onClick={() => handleMonthClick(index)}
            className="text-xs"
          >
            {month.slice(0, 3)}
          </Button>
        ))}
      </div>
    </div>
  );
};

const Advertise = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<SponsorshipType | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [formData, setFormData] = useState({
    message: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launchedProducts, setLaunchedProducts] = useState<LaunchedProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Check authentication state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthChecked(true);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's launched products
  useEffect(() => {
    const fetchLaunchedProducts = async () => {
      if (!user) {
        setLaunchedProducts([]);
        setIsLoadingProducts(false);
        return;
      }

      setIsLoadingProducts(true);

      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          slug, 
          tagline,
          product_media!inner(url, type)
        `)
        .eq('owner_id', user.id)
        .in('status', ['launched', 'scheduled'])
        .eq('product_media.type', 'icon')
        .order('name');

      if (error) {
        console.error('Error fetching launched products:', error);
        // Fallback query without icon filter
        const { data: fallbackData } = await supabase
          .from('products')
          .select('id, name, slug, tagline')
          .eq('owner_id', user.id)
          .in('status', ['launched', 'scheduled'])
          .order('name');
        
        setLaunchedProducts((fallbackData || []).map(p => ({ ...p, iconUrl: null })));
      } else {
        const productsWithIcons = (data || []).map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          tagline: p.tagline,
          iconUrl: Array.isArray(p.product_media) && p.product_media.length > 0 
            ? p.product_media[0].url 
            : null
        }));
        setLaunchedProducts(productsWithIcons);
      }
      setIsLoadingProducts(false);
    };

    if (authChecked) {
      fetchLaunchedProducts();
    }
  }, [user, authChecked]);

  // Handle calendar month selection
  const handleMonthSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const monthStart = startOfMonth(date);
    const today = startOfMonth(new Date());
    
    // Don't allow past months
    if (monthStart < today) {
      toast.error('Cannot select past months');
      return;
    }
    
    // Check if already selected
    if (selectedMonths.some(m => m.getTime() === monthStart.getTime())) {
      toast.error('This month is already selected');
      return;
    }
    
    setSelectedMonths(prev => [...prev, monthStart].sort((a, b) => a.getTime() - b.getTime()));
    setCalendarOpen(false);
  };

  const removeMonth = (month: Date) => {
    setSelectedMonths(prev => prev.filter(m => m.getTime() !== month.getTime()));
  };

  const getPrice = () => {
    switch (selectedType) {
      case 'website': return 250;
      case 'newsletter': return 200;
      case 'combined': return 400;
      default: return 0;
    }
  };

  const calculateTotal = () => {
    return getPrice() * selectedMonths.length;
  };

  const handleGetStarted = (type: SponsorshipType) => {
    if (!user) {
      toast.error('Please sign in to purchase advertising');
      navigate('/auth?redirect=/advertise');
      return;
    }
    setSelectedType(type);
    setStep(2);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (selectedMonths.length === 0) {
      errors.months = 'Please select at least one month';
    }

    // Product selection is required for all sponsorship types
    if (!selectedProductId) {
      errors.product = 'Please select a product';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getSelectedProduct = () => launchedProducts.find(p => p.id === selectedProductId);

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Please select a sponsorship option');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedProduct = getSelectedProduct();
      const launchUrl = selectedProduct ? `https://trylaunch.ai/launch/${selectedProduct.slug}` : '';
      
      const { data, error } = await supabase.functions.invoke('create-advertising-checkout', {
        body: {
          launchUrl,
          productId: selectedProductId,
          sponsorshipType: selectedType,
          months: selectedMonths.length.toString(),
          selectedMonths: selectedMonths.map(m => format(m, 'MMMM yyyy')),
          message: formData.message,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data?.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create checkout. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setShowSuccessModal(true);
      // Clear URL params
      window.history.replaceState({}, '', '/advertise');
    } else if (urlParams.get('canceled') === 'true') {
      toast.info('Payment was canceled.');
      window.history.replaceState({}, '', '/advertise');
    }
  }, []);


  // Success Modal Component
  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">
            Your sponsorship has been activated. You'll receive a confirmation email shortly with all the details.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Your product will appear in the sponsored section during your selected months</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Newsletter sponsors will be featured in our weekly emails</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Check your email for the payment receipt</span>
              </li>
            </ul>
          </div>
          <Button onClick={() => setShowSuccessModal(false)} className="w-full">
            Got it!
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // Stripe Badge Component
  const StripeBadge = () => (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
      <Lock className="h-4 w-4" />
      <span>Payments secured by</span>
      <img src={stripeLogo} alt="Stripe" className="h-6" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-16 overflow-x-hidden">
      {showSuccessModal && <SuccessModal />}
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Advertise with Launch</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach a highly engaged audience of builders and AI early adopters
          </p>
        </div>

        {step === 1 && (
          <>
            {/* Sponsorship Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
              <Card 
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  selectedType === 'website' ? 'border-primary shadow-md ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedType('website')}
              >
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
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetStarted('website');
                  }}
                >
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  selectedType === 'newsletter' ? 'border-primary shadow-md ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedType('newsletter')}
              >
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
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGetStarted('newsletter');
                  }}
                >
                    Get Started
                  </Button>
                </CardContent>
              </Card>

              <Card 
                className={`relative hover:shadow-lg transition-shadow cursor-pointer border-primary shadow-md ${
                  selectedType === 'combined' ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedType('combined')}
              >
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
                      <span className="text-sm">1 newsletter sponsorship (one issue)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Limited availability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Save $50 vs. buying separately</span>
                    </li>
                  </ul>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetStarted('combined');
                    }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>


            {/* Testimonials */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">Trusted by Advertisers</h3>
                <p className="text-muted-foreground">See what other founders are saying about advertising on Launch</p>
              </div>
              <div className="space-y-8">
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
            </div>

            {/* Popular Product Icons */}
            <div className="my-16">
              <PopularProductIcons />
            </div>

            {/* Stats & Features - Two Column Layout */}
            <div className="max-w-3xl mx-auto mb-16 grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Your reach */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-center md:text-left">Your reach</h2>
                <div className="flex flex-col gap-4">
                  {[
                    { value: "70K+", label: "Monthly Impressions" },
                    { value: "2K+", label: "Newsletter Subscribers" },
                    { value: "25%", label: "Email Open Rate" },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why advertise with us */}
              <div>
                <h2 className="text-xl font-semibold mb-6 text-center md:text-left">Why advertise with us</h2>
                <div className="space-y-4">
                  {[
                    { icon: Rocket, title: "Premium Placement", description: "Top-of-page visibility with no competing ads" },
                    { icon: RefreshCw, title: "Targeted Audience", description: "Founders and builders actively seeking new tools" },
                    { icon: Zap, title: "High Intent Traffic", description: "Users ready to discover and try new products" },
                    { icon: Calendar, title: "Flexible Booking", description: "Choose your months and cancel anytime" }
                  ].map((feature) => (
                    <div key={feature.title}>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Placement Preview Section */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-center mb-8">How Your Sponsorship Appears</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Website Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Website Placement</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Sponsored</p>
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">Y</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">Your Product Name</h4>
                          <p className="text-sm text-muted-foreground">Your tagline appears here with your branding</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 border border-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary font-bold">▲</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">123</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Appears at the top of the homepage in a dedicated "Sponsored" section, visible to all visitors.
                    </p>
                  </CardContent>
                </Card>

                {/* Newsletter Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Newsletter Feature</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">This Week's Sponsor</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-primary">Y</span>
                          </div>
                          <div>
                            <h4 className="font-semibold">Your Product Name</h4>
                            <p className="text-xs text-muted-foreground">yourproduct.com</p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Featured description of your product reaching 2,000+ engaged subscribers.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      Featured prominently in our weekly newsletter sent to 2,000+ builders and AI enthusiasts.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-center mb-8">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What are the requirements for advertising?</AccordionTrigger>
                  <AccordionContent>
                    You need to have a launched product on Launch to advertise. Your product must be approved and live before you can purchase advertising. This ensures all sponsored products meet our quality standards.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>When does my sponsorship start?</AccordionTrigger>
                  <AccordionContent>
                    Your sponsorship starts on the first day of your selected month(s). For example, if you select "January 2025", your placement will be active from January 1st through January 31st.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How many sponsored slots are available?</AccordionTrigger>
                  <AccordionContent>
                    Newsletter sponsorships are limited to one sponsor per issue to ensure maximum visibility. Website placements have limited availability each month. This ensures each sponsor gets meaningful exposure without overcrowding.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I get a refund?</AccordionTrigger>
                  <AccordionContent>
                    Full refunds are available if requested before your sponsorship period starts. Once your sponsorship is active, refunds are not available. Please contact us at alex@trylaunch.ai for any refund requests.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Can I change my selected product after purchase?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can request to change the sponsored product before your sponsorship period begins. Contact us at alex@trylaunch.ai with your request.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-6">
                  <AccordionTrigger>Will I receive analytics or performance data?</AccordionTrigger>
                  <AccordionContent>
                    You can view your product's analytics on Launch, including page views and clicks. For newsletter campaigns, we can provide open rates upon request.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="max-w-5xl mx-auto">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to options
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Form - Left Column */}
              <div className="lg:col-span-3 order-2 lg:order-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Get Started</CardTitle>
                    <CardDescription>Select your months and fill in your details</CardDescription>
                  </CardHeader>
                  <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Month Selection */}
                  <div className="space-y-3">
                    <Label className={formErrors.months ? 'text-destructive' : ''}>
                      Select Month(s) to Advertise *
                    </Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedMonths.length && "text-muted-foreground",
                            formErrors.months && "border-destructive"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedMonths.length > 0 
                            ? `${selectedMonths.length} month${selectedMonths.length > 1 ? 's' : ''} selected`
                            : "Click to select months"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4" align="start">
                        <MonthYearPicker onSelect={handleMonthSelect} />
                      </PopoverContent>
                    </Popover>
                    {formErrors.months && (
                      <p className="text-sm text-destructive">{formErrors.months}</p>
                    )}
                    
                    {selectedMonths.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedMonths.map((month) => (
                          <Badge 
                            key={month.getTime()} 
                            variant="secondary"
                            className="flex items-center gap-1 py-1.5 px-3"
                          >
                            {format(month, 'MMMM yyyy')}
                            <button
                              type="button"
                              onClick={() => removeMonth(month)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label 
                      className={formErrors.product ? 'text-destructive' : ''}
                    >
                      Select Product *
                    </Label>
                    {launchedProducts.length === 0 && !isLoadingProducts ? (
                      <div className="p-4 border rounded-md bg-muted/50">
                        <p className="text-sm text-muted-foreground">
                          You don't have any launched products yet.{' '}
                          <a href="/submit" className="text-primary hover:underline">
                            Submit a product
                          </a>{' '}
                          first to advertise it.
                        </p>
                      </div>
                    ) : (
                      <Select 
                        value={selectedProductId} 
                        onValueChange={(value) => {
                          setSelectedProductId(value);
                          if (formErrors.product) setFormErrors(prev => ({ ...prev, product: '' }));
                        }}
                        disabled={isLoadingProducts}
                      >
                        <SelectTrigger className={formErrors.product ? 'border-destructive' : ''}>
                          <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select a product to sponsor"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {launchedProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="flex items-center gap-3">
                                <img 
                                  src={product.iconUrl || defaultProductIcon} 
                                  alt={product.name || 'Product'} 
                                  className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                                />
                                <div className="flex flex-col">
                                  <span>{product.name}</span>
                                  {product.tagline && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">{product.tagline}</span>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {formErrors.product && (
                      <p className="text-sm text-destructive">{formErrors.product}</p>
                    )}
                    {selectedProductId && (
                      <p className="text-sm text-muted-foreground">
                        This product will be featured as a sponsored listing
                      </p>
                    )}
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="message">Additional Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us about your product or any questions you have..."
                      rows={4}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting || selectedMonths.length === 0 || !selectedProductId} 
                    className="w-full"
                  >
                    {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                  </Button>
                  
                  <StripeBadge />
                </form>
              </CardContent>
            </Card>
              </div>

              {/* Selected Package Summary - Right Column */}
              <div className="lg:col-span-2 order-1 lg:order-2">
                <div className="sticky top-6 space-y-6">
                  {/* Package Summary */}
                  <div className="p-6 bg-muted/30 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Selected package:</p>
                    <p className="text-xl font-semibold mb-4">
                      {selectedType === 'website' && 'Website Placement'}
                      {selectedType === 'newsletter' && 'Newsletter Sponsorship'}
                      {selectedType === 'combined' && 'Combined Package'}
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price per month</span>
                        <span className="font-medium">${getPrice().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Months selected</span>
                        <span className="font-medium">{selectedMonths.length}</span>
                      </div>
                      {selectedMonths.length > 0 && (
                        <div className="pt-3 border-t">
                          <p className="text-xs text-muted-foreground mb-2">Selected months:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedMonths.map((month) => (
                              <Badge key={month.getTime()} variant="outline" className="text-xs">
                                {format(month, 'MMM yyyy')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-3xl font-bold text-primary">
                          ${calculateTotal().toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <StripeBadge />
                  </div>

                  {/* Ad Preview Section */}
                  {selectedProductId && (selectedType === 'website' || selectedType === 'combined') && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Website Preview</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Sponsored</p>
                        <div className="flex items-start gap-3">
                          <img 
                            src={getSelectedProduct()?.iconUrl || defaultProductIcon} 
                            alt={getSelectedProduct()?.name || 'Product'}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{getSelectedProduct()?.name || 'Your Product'}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{getSelectedProduct()?.tagline || 'Your tagline appears here'}</p>
                          </div>
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="w-8 h-8 border border-primary rounded-md flex items-center justify-center">
                              <span className="text-primary text-sm font-bold">▲</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">123</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Appears at the top of the homepage
                      </p>
                    </div>
                  )}

                  {selectedProductId && (selectedType === 'newsletter' || selectedType === 'combined') && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <Mail className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">Newsletter Preview</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">This Week's Sponsor</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={getSelectedProduct()?.iconUrl || defaultProductIcon} 
                              alt={getSelectedProduct()?.name || 'Product'}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm truncate">{getSelectedProduct()?.name || 'Your Product'}</h4>
                              <p className="text-[10px] text-muted-foreground">trylaunch.ai/launch/{getSelectedProduct()?.slug || 'your-product'}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {getSelectedProduct()?.tagline || 'Featured description of your product reaching 2,000+ engaged subscribers.'}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Featured in our weekly newsletter
                      </p>
                    </div>
                  )}

                  {!selectedProductId && (
                    <div className="p-4 bg-muted/20 rounded-lg border border-dashed">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <p className="text-sm">Select a product to see your ad preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}


        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            Questions?{' '}
            <a href="mailto:alex@trylaunch.ai" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Advertise;
