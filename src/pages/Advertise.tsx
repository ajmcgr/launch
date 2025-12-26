import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type SponsorshipType = 'website' | 'newsletter' | 'combined' | null;

const Advertise = () => {
  const [selectedType, setSelectedType] = useState<SponsorshipType>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    launchUrl: '',
    months: '1',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getPrice = () => {
    switch (selectedType) {
      case 'website': return 1000;
      case 'newsletter': return 500;
      case 'combined': return 1250;
      default: return 0;
    }
  };

  const calculateTotal = () => {
    return getPrice() * parseInt(formData.months);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType) {
      toast.error('Please select a sponsorship option');
      return;
    }

    if (!formData.name || !formData.email || !formData.company) {
      toast.error('Please fill in all required fields');
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
          months: formData.months,
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
          months: '1',
          message: '',
        });
        setSelectedType(null);
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

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Advertise with Launch</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Reach a highly engaged audience of builders and AI early adopters
          </p>
        </div>

        {/* Sponsorship Options - Same layout as /pricing */}
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
                  <span className="text-sm">Sponsored listing at top of homepage</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Only 1 sponsor per month</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg" 
                variant={selectedType === 'website' ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType('website');
                }}
              >
                {selectedType === 'website' ? 'Selected' : 'Select'}
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
                variant={selectedType === 'newsletter' ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType('newsletter');
                }}
              >
                {selectedType === 'newsletter' ? 'Selected' : 'Select'}
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
                  <span className="text-sm">Save $250/month with bundle</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">Maximum exposure across both channels</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                size="lg"
                variant={selectedType === 'combined' ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedType('combined');
                }}
              >
                {selectedType === 'combined' ? 'Selected' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Fill in your details and we'll send you an invoice</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@company.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      required
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Your company name"
                    />
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
                  <Label htmlFor="months">Duration</Label>
                  <Select
                    value={formData.months}
                    onValueChange={(value) => setFormData({ ...formData, months: value })}
                  >
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="2">2 months</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedType && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-lg font-semibold">
                      Total: <span className="text-primary">${calculateTotal().toLocaleString()}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedType === 'website' && 'Website Placement'}
                      {selectedType === 'newsletter' && 'Newsletter Sponsorship'}
                      {selectedType === 'combined' && 'Combined Package'}
                      {' × '}{formData.months} month(s)
                    </p>
                  </div>
                )}

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

                <Button type="submit" size="lg" disabled={isSubmitting || !selectedType} className="w-full">
                  {isSubmitting ? 'Sending...' : 'Request Invoice'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

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
