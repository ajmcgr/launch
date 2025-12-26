import { useState, useMemo } from 'react';
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
    name: '',
    email: '',
    company: '',
    website: '',
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

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.company.trim()) {
      errors.company = 'Company is required';
    }
    
    if (selectedMonths.length === 0) {
      errors.months = 'Please select at least one month';
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
      const { data, error } = await supabase.functions.invoke('create-advertising-invoice', {
        body: {
          name: formData.name,
          email: formData.email,
          company: formData.company,
          website: formData.website,
          launchUrl: formData.launchUrl,
          websiteSponsorship: selectedType === 'website' || selectedType === 'combined',
          newsletterSponsorship: selectedType === 'newsletter' || selectedType === 'combined',
          months: selectedMonths.length.toString(),
          selectedMonths: selectedMonths.map(m => format(m, 'MMMM yyyy')),
          message: formData.message,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Invoice sent! Check your email for payment details.');
        // Reset form
        setFormData({
          name: '',
          email: '',
          company: '',
          website: '',
          launchUrl: '',
          message: '',
        });
        setSelectedType(null);
        setSelectedMonths([]);
        setStep(1);
      } else {
        throw new Error(data?.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                      <span className="text-sm">Sponsored listing at top of homepage for 1 month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">2,000+ users</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Only 1 sponsor per month</span>
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
                      <span className="text-sm">Sponsored listing at top of homepage for 1 month</span>
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
          <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to options
            </Button>

            {/* Selected Package Summary with Live Total */}
            <div className="mb-8 p-4 bg-muted/30 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Selected package:</p>
                  <p className="text-lg font-semibold">
                    {selectedType === 'website' && 'Website Placement - $1,000/month'}
                    {selectedType === 'newsletter' && 'Newsletter Sponsorship - $500/month'}
                    {selectedType === 'combined' && 'Combined Package - $1,250/month'}
                  </p>
                </div>
                {selectedMonths.length > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{selectedMonths.length} month(s)</p>
                    <p className="text-2xl font-bold text-primary">${calculateTotal().toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

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

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className={formErrors.name ? 'text-destructive' : ''}>
                        Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                        }}
                        placeholder="Your name"
                        className={formErrors.name ? 'border-destructive' : ''}
                      />
                      {formErrors.name && (
                        <p className="text-sm text-destructive">{formErrors.name}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className={formErrors.email ? 'text-destructive' : ''}>
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                        }}
                        placeholder="you@company.com"
                        className={formErrors.email ? 'border-destructive' : ''}
                      />
                      {formErrors.email && (
                        <p className="text-sm text-destructive">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company" className={formErrors.company ? 'text-destructive' : ''}>
                        Company *
                      </Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => {
                          setFormData({ ...formData, company: e.target.value });
                          if (formErrors.company) setFormErrors(prev => ({ ...prev, company: '' }));
                        }}
                        placeholder="Your company name"
                        className={formErrors.company ? 'border-destructive' : ''}
                      />
                      {formErrors.company && (
                        <p className="text-sm text-destructive">{formErrors.company}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="launchUrl">Existing Launch URL (optional)</Label>
                    <Input
                      id="launchUrl"
                      type="url"
                      value={formData.launchUrl}
                      onChange={(e) => setFormData({ ...formData, launchUrl: e.target.value })}
                      placeholder="https://trylaunch.ai/launch/your-product"
                    />
                    <p className="text-sm text-muted-foreground">
                      If you already have a product on Launch, paste the link here
                    </p>
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
                  <p className="text-sm text-muted-foreground text-center">
                    By clicking submit, you'll be redirected to complete payment. After successful payment, we'll contact you to schedule your campaign.
                  </p>
                </form>
              </CardContent>
            </Card>
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
