import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, X, Eye, Mail, CheckCircle, HelpCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';

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

const YEARS_AVAILABLE = 10; // Show next 10 years of dates
const MAX_WEBSITE_SLOTS = 4;
const MAX_NEWSLETTER_SLOTS = 4;

// Track booked slots per month
interface MonthAvailability {
  websiteBooked: number;
  newsletterBooked: number;
}

const Advertise = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<SponsorshipType | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [formData, setFormData] = useState({
    message: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState<Record<string, MonthAvailability>>({});
  const [launchedProducts, setLaunchedProducts] = useState<LaunchedProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        .eq('status', 'launched')
        .eq('product_media.type', 'icon')
        .order('name');

      if (error) {
        console.error('Error fetching launched products:', error);
        // Fallback query without icon filter
        const { data: fallbackData } = await supabase
          .from('products')
          .select('id, name, slug, tagline')
          .eq('owner_id', user.id)
          .eq('status', 'launched')
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

  // Fetch existing sponsored products to check availability
  useEffect(() => {
    const fetchAvailability = async () => {
      const { data, error } = await supabase
        .from('sponsored_products')
        .select('start_date, sponsorship_type')
        .gte('start_date', format(new Date(), 'yyyy-MM-01'));

      if (error) {
        console.error('Error fetching availability:', error);
        return;
      }

      // Build availability map by month
      const availMap: Record<string, MonthAvailability> = {};
      data?.forEach((sp) => {
        const monthKey = sp.start_date.substring(0, 7); // 'YYYY-MM' format
        if (!availMap[monthKey]) {
          availMap[monthKey] = { websiteBooked: 0, newsletterBooked: 0 };
        }
        if (sp.sponsorship_type === 'website' || sp.sponsorship_type === 'combined') {
          availMap[monthKey].websiteBooked++;
        }
        if (sp.sponsorship_type === 'newsletter' || sp.sponsorship_type === 'combined') {
          availMap[monthKey].newsletterBooked++;
        }
      });
      setAvailability(availMap);
    };

    fetchAvailability();
  }, []);

  // Check if a month is available for the selected sponsorship type
  const isMonthAvailable = (date: Date, type: SponsorshipType | null): boolean => {
    if (!type) return true;
    const monthKey = format(date, 'yyyy-MM');
    const avail = availability[monthKey] || { websiteBooked: 0, newsletterBooked: 0 };

    switch (type) {
      case 'website':
        return avail.websiteBooked < MAX_WEBSITE_SLOTS;
      case 'newsletter':
        return avail.newsletterBooked < MAX_NEWSLETTER_SLOTS;
      case 'combined':
        return avail.websiteBooked < MAX_WEBSITE_SLOTS && avail.newsletterBooked < MAX_NEWSLETTER_SLOTS;
      default:
        return true;
    }
  };

  // Get remaining slots for display
  const getRemainingSlots = (date: Date, type: SponsorshipType | null): string => {
    if (!type) return '';
    const monthKey = format(date, 'yyyy-MM');
    const avail = availability[monthKey] || { websiteBooked: 0, newsletterBooked: 0 };

    switch (type) {
      case 'website':
        return `${MAX_WEBSITE_SLOTS - avail.websiteBooked} slots left`;
      case 'newsletter':
        return `${MAX_NEWSLETTER_SLOTS - avail.newsletterBooked} slots left`;
      case 'combined': {
        const websiteLeft = MAX_WEBSITE_SLOTS - avail.websiteBooked;
        const newsletterLeft = MAX_NEWSLETTER_SLOTS - avail.newsletterBooked;
        return `${Math.min(websiteLeft, newsletterLeft)} slots left`;
      }
      default:
        return '';
    }
  };

  // Generate available years (current year + next 10 years)
  const getAvailableYears = () => {
    const years: number[] = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i <= YEARS_AVAILABLE; i++) {
      years.push(currentYear + i);
    }
    return years;
  };

  // Generate months for the selected year, filtering out past and fully booked months
  const getMonthsForYear = (year: number) => {
    const months: { value: number; label: string; date: Date; available: boolean; slotsInfo: string }[] = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    for (let month = 0; month < 12; month++) {
      // Skip past months for current year
      if (year === currentYear && month <= currentMonth) continue;
      
      const date = startOfMonth(new Date(year, month, 1));
      // Skip if already selected
      if (selectedMonths.some(m => m.getTime() === date.getTime())) continue;
      
      const available = isMonthAvailable(date, selectedType);
      const slotsInfo = getRemainingSlots(date, selectedType);
      
      months.push({
        value: month,
        label: format(date, 'MMMM'),
        date,
        available,
        slotsInfo
      });
    }
    return months;
  };

  const addSelectedMonth = () => {
    if (!selectedYear || !selectedMonth) return;
    
    const date = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth), 1));
    if (!selectedMonths.some(m => m.getTime() === date.getTime())) {
      setSelectedMonths(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()));
    }
    // Reset month selection after adding
    setSelectedMonth('');
  };

  const removeMonth = (month: Date) => {
    setSelectedMonths(prev => prev.filter(m => m.getTime() !== month.getTime()));
  };

  const getPrice = () => {
    switch (selectedType) {
      case 'website': return 750;
      case 'newsletter': return 500;
      case 'combined': return 1000;
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

  const availableYears = useMemo(() => getAvailableYears(), []);
  const monthsForSelectedYear = useMemo(() => {
    if (!selectedYear) return [];
    return getMonthsForYear(parseInt(selectedYear));
  }, [selectedYear, selectedMonths]);

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
    <div className="min-h-screen bg-background py-16">
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
                <CardDescription>Permanent display on homepage leaderboard</CardDescription>
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
                    <span className="text-sm">6,000+ monthly visitors</span>
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
                      <span className="text-sm">6,000+ monthly visitors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">2,000+ subscribers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Save $250/month with bundle</span>
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
              <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
                <HelpCircle className="h-6 w-6" />
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
                  <AccordionTrigger>How many sponsored slots are available per month?</AccordionTrigger>
                  <AccordionContent>
                    We limit sponsorships to 4 slots per month for both website placements and newsletter features. This ensures each sponsor gets meaningful visibility without overcrowding.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>Can I get a refund?</AccordionTrigger>
                  <AccordionContent>
                    Full refunds are available if requested before your sponsorship period starts. Once your sponsorship is active, refunds are not available. Please contact us at alex@trymedia.ai for any refund requests.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-5">
                  <AccordionTrigger>Can I change my selected product after purchase?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can request to change the sponsored product before your sponsorship period begins. Contact us at alex@trymedia.ai with your request.
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
                    <div className="flex gap-2">
                      <Select value={selectedYear} onValueChange={(value) => {
                        setSelectedYear(value);
                        setSelectedMonth(''); // Reset month when year changes
                      }}>
                        <SelectTrigger className={`w-[120px] ${formErrors.months ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Select 
                        value={selectedMonth} 
                        onValueChange={setSelectedMonth}
                        disabled={!selectedYear}
                      >
                        <SelectTrigger className={`flex-1 ${formErrors.months ? 'border-destructive' : ''}`}>
                          <SelectValue placeholder={selectedYear ? "Select month" : "Select year first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {monthsForSelectedYear.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              No available months
                            </div>
                          ) : (
                            monthsForSelectedYear.map((month) => (
                              <SelectItem 
                                key={month.value} 
                                value={month.value.toString()}
                                disabled={!month.available}
                                className={!month.available ? 'opacity-50' : ''}
                              >
                                <span className="flex items-center justify-between w-full gap-2">
                                  {month.label}
                                  {!month.available ? (
                                    <Badge variant="secondary" className="text-xs ml-2">Sold Out</Badge>
                                  ) : month.slotsInfo && (
                                    <span className="text-xs text-muted-foreground ml-2">{month.slotsInfo}</span>
                                  )}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={addSelectedMonth}
                        disabled={!selectedYear || !selectedMonth}
                      >
                        Add
                      </Button>
                    </div>
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
                    disabled={isSubmitting || selectedMonths.length === 0} 
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
                <div className="sticky top-6 p-6 bg-muted/30 rounded-lg border">
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
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Questions?{' '}
            <a href="mailto:alex@trymedia.ai" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Advertise;
