import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, startOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SponsorshipType = 'website' | 'newsletter' | 'combined';

const YEARS_AVAILABLE = 10; // Show next 10 years of dates

const Advertise = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<SponsorshipType | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<Date[]>([]);
  const [formData, setFormData] = useState({
    launchUrl: '',
    message: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAvailableMonths = () => {
    const months: Date[] = [];
    const today = new Date();
    // Show next 10 years of months (120 months)
    for (let i = 1; i <= YEARS_AVAILABLE * 12; i++) {
      months.push(startOfMonth(addMonths(today, i)));
    }
    return months;
  };

  const addMonth = (monthStr: string) => {
    const month = availableMonths.find(m => m.getTime().toString() === monthStr);
    if (month && !selectedMonths.some(m => m.getTime() === month.getTime())) {
      setSelectedMonths(prev => [...prev, month].sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const removeMonth = (month: Date) => {
    setSelectedMonths(prev => prev.filter(m => m.getTime() !== month.getTime()));
  };

  const getPrice = () => {
    switch (selectedType) {
      case 'website': return 1000;
      case 'newsletter': return 500;
      case 'combined': return 1250;
      default: return 0;
    }
  };

  const calculateTotal = () => {
    return getPrice() * selectedMonths.length;
  };


  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (selectedMonths.length === 0) {
      errors.months = 'Please select at least one month';
    }

    // Launch URL is required for all sponsorship types
    if (!formData.launchUrl.trim()) {
      errors.launchUrl = 'Launch URL is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      const { data, error } = await supabase.functions.invoke('create-advertising-checkout', {
        body: {
          launchUrl: formData.launchUrl,
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
      toast.success('Payment successful! Your sponsorship has been activated.');
      // Clear URL params
      window.history.replaceState({}, '', '/advertise');
    } else if (urlParams.get('canceled') === 'true') {
      toast.info('Payment was canceled.');
      window.history.replaceState({}, '', '/advertise');
    }
  }, []);

  const availableMonths = useMemo(() => getAvailableMonths(), []);

  return (
    <div className="min-h-screen bg-background py-16">
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
                  <CardDescription>Prominent display directly above leaderboard</CardDescription>
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
                      <span className="text-sm">Position 1: Top of leaderboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Positions 2-4: Interspersed in feed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">2,000+ monthly visitors</span>
                    </li>
                  </ul>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedType('website');
                      setStep(2);
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
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Only 4 sponsors per month</span>
                    </li>
                  </ul>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedType('newsletter');
                      setStep(2);
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
                    $1,250<span className="text-base font-normal text-muted-foreground"> / month</span>
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
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedType('combined');
                      setStep(2);
                    }}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
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
                    <Select onValueChange={addMonth}>
                      <SelectTrigger className={`w-full ${formErrors.months ? 'border-destructive' : ''}`}>
                        <SelectValue placeholder="Select a month to add" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 bg-background">
                        {availableMonths
                          .filter(month => !selectedMonths.some(m => m.getTime() === month.getTime()))
                          .map((month) => (
                            <SelectItem key={month.getTime()} value={month.getTime().toString()}>
                              {format(month, 'MMMM yyyy')}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
                      htmlFor="launchUrl"
                      className={formErrors.launchUrl ? 'text-destructive' : ''}
                    >
                      Launch URL *
                    </Label>
                    <Input
                      id="launchUrl"
                      type="url"
                      value={formData.launchUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, launchUrl: e.target.value });
                        if (formErrors.launchUrl) setFormErrors(prev => ({ ...prev, launchUrl: '' }));
                      }}
                      placeholder="https://trylaunch.ai/launch/your-product"
                      className={formErrors.launchUrl ? 'border-destructive' : ''}
                    />
                    {formErrors.launchUrl ? (
                      <p className="text-sm text-destructive">{formErrors.launchUrl}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Your product listing on Launch that will be sponsored
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
                    {isSubmitting ? 'Processing...' : 'Submit'}
                  </Button>
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
