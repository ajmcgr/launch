import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const Advertise = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    website: '',
    launchUrl: '',
    websiteSponsorship: false,
    newsletterSponsorship: false,
    months: '1',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotal = () => {
    let total = 0;
    const months = parseInt(formData.months);
    
    if (formData.websiteSponsorship && formData.newsletterSponsorship) {
      total = 1250 * months;
    } else {
      if (formData.websiteSponsorship) total += 1000 * months;
      if (formData.newsletterSponsorship) total += 500 * months;
    }
    
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.websiteSponsorship && !formData.newsletterSponsorship) {
      toast.error('Please select at least one sponsorship option');
      return;
    }

    setIsSubmitting(true);
    
    const sponsorshipTypes = [];
    if (formData.websiteSponsorship) sponsorshipTypes.push('Website Placement');
    if (formData.newsletterSponsorship) sponsorshipTypes.push('Newsletter Sponsorship');
    
    const subject = encodeURIComponent(`Sponsorship Inquiry - ${sponsorshipTypes.join(' + ')}`);
    const body = encodeURIComponent(`Name: ${formData.name}
Email: ${formData.email}
Company: ${formData.company}
Website: ${formData.website}
${formData.launchUrl ? `Existing Launch: ${formData.launchUrl}` : ''}

Sponsorship Type: ${sponsorshipTypes.join(', ')}
Duration: ${formData.months} month(s)
Estimated Total: $${calculateTotal().toLocaleString()}

Message:
${formData.message}`);

    window.location.href = `mailto:alex@trymedia.ai?subject=${subject}&body=${body}`;
    
    setIsSubmitting(false);
    toast.success('Opening your email client...');
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Advertise with Launch</h1>
        <p className="text-muted-foreground mb-8">
          Reach a highly engaged audience of builders and AI early adopters
        </p>

        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Sponsorship Options</h2>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="border rounded-lg p-6 space-y-3">
                <h3 className="text-xl font-semibold">Website Placement</h3>
                <p className="text-muted-foreground">
                  Prominent display directly above leaderboard
                </p>
                <p className="text-2xl font-bold text-primary">$1,000 / month</p>
              </div>
              
              <div className="border rounded-lg p-6 space-y-3">
                <h3 className="text-xl font-semibold">Newsletter Sponsorship</h3>
                <p className="text-muted-foreground">
                  Featured placement in our weekly newsletter (2,000+ subscribers)
                </p>
                <p className="text-2xl font-bold text-primary">$500 / month</p>
              </div>
            </div>

            <div className="border rounded-lg p-6 space-y-3 bg-primary/5 border-primary/20">
              <h3 className="text-xl font-semibold">Combined Package</h3>
              <p className="text-muted-foreground">
                Get consistent exposure across both website and newsletter
              </p>
              <p className="text-2xl font-bold text-primary">$1,250 / month</p>
              <p className="text-sm text-muted-foreground">Save $250/month with the bundle</p>
            </div>
          </div>

          <div className="border-t pt-8">
            <h2 className="text-2xl font-bold mb-6">Get Started</h2>
            
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

              <div className="space-y-4">
                <Label>Sponsorship Type *</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="website"
                      checked={formData.websiteSponsorship}
                      onCheckedChange={(checked) => setFormData({ ...formData, websiteSponsorship: checked as boolean })}
                    />
                    <Label htmlFor="website" className="font-normal cursor-pointer">
                      Website Placement ($1,000/month)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="newsletter"
                      checked={formData.newsletterSponsorship}
                      onCheckedChange={(checked) => setFormData({ ...formData, newsletterSponsorship: checked as boolean })}
                    />
                    <Label htmlFor="newsletter" className="font-normal cursor-pointer">
                      Newsletter Sponsorship ($500/month)
                    </Label>
                  </div>
                </div>
                {formData.websiteSponsorship && formData.newsletterSponsorship && (
                  <p className="text-sm text-primary">Bundle discount applied: $1,250/month instead of $1,500</p>
                )}
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

              {(formData.websiteSponsorship || formData.newsletterSponsorship) && (
                <div className="border rounded-lg p-4 bg-muted/30">
                  <p className="text-lg font-semibold">
                    Estimated Total: <span className="text-primary">${calculateTotal().toLocaleString()}</span>
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

              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advertise;