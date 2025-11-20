import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES, PRICING_PLANS } from '@/lib/constants';
import { toast } from 'sonner';

const Submit = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    url: '',
    description: '',
    categories: [] as string[],
    slug: '',
    plan: 'join' as 'join' | 'skip' | 'relaunch',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Please sign up to submit a product');
        navigate('/auth?mode=signup');
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from name
    if (field === 'name') {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : prev.categories.length < 3
        ? [...prev.categories, category]
        : prev.categories
    }));
  };

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.tagline || !formData.url)) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (step === 3 && (!formData.description || formData.categories.length === 0)) {
      toast.error('Please add a description and select at least one category');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          plan: formData.plan,
          productData: {
            name: formData.name,
            tagline: formData.tagline,
            url: formData.url,
            description: formData.description,
            categories: formData.categories,
            slug: formData.slug,
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Submit Your Product</h1>
          <p className="text-muted-foreground">Launch your product to thousands of founders</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s}
                </div>
                {s < 5 && <div className={`flex-1 h-1 mx-2 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Basic Information'}
              {step === 2 && 'Media & Assets'}
              {step === 3 && 'Product Details'}
              {step === 4 && 'Choose Launch Plan'}
              {step === 5 && 'Review & Confirm'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your product'}
              {step === 2 && 'Upload images and media'}
              {step === 3 && 'Provide detailed information'}
              {step === 4 && 'Select when you want to launch'}
              {step === 5 && 'Review your submission before payment'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="My Awesome Product"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline *</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                    placeholder="A brief description of what you do"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Thumbnail Image *</Label>
                  <Input type="file" accept="image/*" />
                  <p className="text-sm text-muted-foreground">Recommended: 1200x630px</p>
                </div>
                <div className="space-y-2">
                  <Label>Product Icon</Label>
                  <Input type="file" accept="image/*" />
                  <p className="text-sm text-muted-foreground">Recommended: 512x512px</p>
                </div>
                <div className="space-y-2">
                  <Label>Screenshots (3-6 images)</Label>
                  <Input type="file" accept="image/*" multiple />
                </div>
                <div className="space-y-2">
                  <Label>Demo Video URL (Optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your product in detail..."
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categories (Select up to 3) *</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-4 border rounded-md">
                    {CATEGORIES.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={formData.categories.includes(category)}
                          onCheckedChange={() => handleCategoryToggle(category)}
                          disabled={!formData.categories.includes(category) && formData.categories.length >= 3}
                        />
                        <Label htmlFor={category} className="text-sm cursor-pointer">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="my-product"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your product will be available at: trylaunch.ai/launch/{formData.slug || 'your-slug'}
                  </p>
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-4">
                {PRICING_PLANS.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      formData.plan === plan.id ? 'border-primary ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleInputChange('plan', plan.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>{plan.description}</CardDescription>
                        </div>
                        <div className="text-2xl font-bold">${plan.price}</div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Product: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">{formData.tagline}</p>
                  <p className="text-sm">Categories: {formData.categories.join(', ')}</p>
                  <p className="text-sm">Plan: {PRICING_PLANS.find(p => p.id === formData.plan)?.name}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  By clicking confirm, you'll be redirected to Stripe to complete your payment.
                  After successful payment, your product will be scheduled for launch.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
              {step < 5 ? (
                <Button onClick={handleNext} className="ml-auto">
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="ml-auto">
                  Proceed to Payment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Submit;
