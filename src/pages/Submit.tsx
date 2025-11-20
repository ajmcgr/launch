import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES, PRICING_PLANS } from '@/lib/constants';
import { toast } from 'sonner';

const Submit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const [user, setUser] = useState<any>(null);
  const [productId, setProductId] = useState<string | null>(draftId);
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('submitStep');
    return saved ? parseInt(saved) : 1;
  });
  const [uploadedMedia, setUploadedMedia] = useState<{ icon?: string; thumbnail?: string; screenshots: string[] }>(() => {
    const saved = localStorage.getItem('submitMedia');
    return saved ? JSON.parse(saved) : { screenshots: [] };
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('submitFormData');
    return saved ? JSON.parse(saved) : {
      name: '',
      tagline: '',
      url: '',
      description: '',
      categories: [] as string[],
      slug: '',
      plan: 'join' as 'join' | 'skip' | 'relaunch',
      selectedDate: null as string | null,
    };
  });

  // Save to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem('submitFormData', JSON.stringify(formData));
  }, [formData]);

  // Save to localStorage whenever uploadedMedia changes
  useEffect(() => {
    localStorage.setItem('submitMedia', JSON.stringify(uploadedMedia));
  }, [uploadedMedia]);

  // Save to localStorage whenever step changes
  useEffect(() => {
    localStorage.setItem('submitStep', step.toString());
  }, [step]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        toast.error('Please sign up to submit a product');
        navigate('/auth?mode=signup');
      } else {
        setUser(session.user);
        
        // Load draft if draftId is present
        if (draftId) {
          await loadDraft(draftId);
        }
      }
    });
  }, [navigate, draftId]);

  const loadDraft = async (id: string) => {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          product_media(url, type),
          product_category_map(
            product_categories(name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const media = {
        icon: product.product_media?.find((m: any) => m.type === 'icon')?.url,
        thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
        screenshots: product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
      };

      setFormData({
        name: product.name || '',
        tagline: product.tagline || '',
        url: product.domain_url || '',
        description: product.description || '',
        categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
        slug: product.slug || '',
        plan: 'join',
        selectedDate: product.launch_date,
      });
      
      setUploadedMedia(media);
      toast.success('Draft loaded successfully');
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    }
  };

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

  const handleFileUpload = async (type: 'icon' | 'thumbnail' | 'screenshots', files: FileList | null) => {
    if (!files || !user) return;
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${type}/${Math.random()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('product-media')
          .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('product-media')
          .getPublicUrl(fileName);
        
        return publicUrl;
      });
      
      const urls = await Promise.all(uploadPromises);
      
      if (type === 'screenshots') {
        setUploadedMedia(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, ...urls]
        }));
      } else {
        setUploadedMedia(prev => ({
          ...prev,
          [type]: urls[0]
        }));
      }
      
      toast.success('Files uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    }
  };

  const handleDeleteMedia = async (type: 'icon' | 'thumbnail' | 'screenshots', index?: number) => {
    try {
      if (type === 'screenshots' && index !== undefined) {
        const url = uploadedMedia.screenshots[index];
        // Extract file path from URL
        const fileName = url.split('/product-media/')[1];
        if (fileName) {
          await supabase.storage.from('product-media').remove([fileName]);
        }
        setUploadedMedia(prev => ({
          ...prev,
          screenshots: prev.screenshots.filter((_, i) => i !== index)
        }));
      } else {
        const url = uploadedMedia[type];
        if (url && typeof url === 'string') {
          const fileName = url.split('/product-media/')[1];
          if (fileName) {
            await supabase.storage.from('product-media').remove([fileName]);
          }
          setUploadedMedia(prev => ({
            ...prev,
            [type]: undefined
          }));
        }
      }
      toast.success('Image deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
    }
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

  const handleSaveDraft = async () => {
    if (!user) return;

    try {
      toast.info('Saving draft...');

      // Use existing productId or create new product
      let currentProductId = productId;

      if (!currentProductId) {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            owner_id: user.id,
            name: formData.name || 'Untitled Product',
            tagline: formData.tagline,
            domain_url: formData.url,
            description: formData.description,
            slug: formData.slug || `draft-${Date.now()}`,
            status: 'draft',
          })
          .select()
          .single();

        if (productError) throw productError;
        currentProductId = newProduct.id;
        setProductId(currentProductId);
      } else {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: formData.name || 'Untitled Product',
            tagline: formData.tagline,
            domain_url: formData.url,
            description: formData.description,
            slug: formData.slug,
          })
          .eq('id', currentProductId);

        if (updateError) throw updateError;
      }

      // Save media
      if (uploadedMedia.icon || uploadedMedia.thumbnail || uploadedMedia.screenshots.length > 0) {
        // Delete existing media
        await supabase
          .from('product_media')
          .delete()
          .eq('product_id', currentProductId);

        // Insert new media
        const mediaInserts = [];
        if (uploadedMedia.icon) {
          mediaInserts.push({ product_id: currentProductId, type: 'icon', url: uploadedMedia.icon });
        }
        if (uploadedMedia.thumbnail) {
          mediaInserts.push({ product_id: currentProductId, type: 'thumbnail', url: uploadedMedia.thumbnail });
        }
        uploadedMedia.screenshots.forEach(url => {
          mediaInserts.push({ product_id: currentProductId, type: 'screenshot', url });
        });

        if (mediaInserts.length > 0) {
          await supabase.from('product_media').insert(mediaInserts);
        }
      }

      // Save categories
      if (formData.categories.length > 0) {
        // Delete existing categories
        await supabase
          .from('product_category_map')
          .delete()
          .eq('product_id', currentProductId);

        // Get category IDs
        const { data: categories } = await supabase
          .from('product_categories')
          .select('id, name')
          .in('name', formData.categories);

        if (categories) {
          const categoryMappings = categories.map(cat => ({
            product_id: currentProductId,
            category_id: cat.id,
          }));
          await supabase.from('product_category_map').insert(categoryMappings);
        }
      }

      toast.success('Draft saved successfully!');
      navigate('/my-products');
    } catch (error) {
      console.error('Save draft error:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in again');
        navigate('/auth?mode=signin');
        return;
      }
      
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: formData.plan,
          selectedDate: formData.selectedDate,
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
        // Open Stripe checkout in new window
        window.open(data.url, '_blank');
        toast.success('Checkout opened in new window. Complete payment to launch your product!');
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    }
  };

  // Clear form data if returning from successful payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      localStorage.removeItem('submitFormData');
      localStorage.removeItem('submitMedia');
      localStorage.removeItem('submitStep');
      localStorage.removeItem('submitPendingPayment');
    }
  }, []);

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
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {s}
                </div>
                {s < 5 && <div className="w-12 h-0.5 bg-muted mx-2" />}
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
              {step === 4 && 'Choose Your Plan'}
              {step === 5 && 'Review & Submit'}
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
                  <Label>Product Icon *</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleFileUpload('icon', e.target.files)}
                  />
                  <p className="text-sm text-muted-foreground">Recommended: 512x512px</p>
                  {uploadedMedia.icon && (
                    <div className="mt-2 relative inline-block">
                      <img src={uploadedMedia.icon} alt="Icon preview" className="w-24 h-24 object-cover rounded-lg border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={() => handleDeleteMedia('icon')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail Image *</Label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload('thumbnail', e.target.files)}
                  />
                  <p className="text-sm text-muted-foreground">Recommended: 1200x630px</p>
                  {uploadedMedia.thumbnail && (
                    <div className="mt-2 relative inline-block">
                      <img src={uploadedMedia.thumbnail} alt="Thumbnail preview" className="w-full h-48 object-cover rounded-lg border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={() => handleDeleteMedia('thumbnail')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Screenshots (3-6 images)</Label>
                  <Input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    onChange={(e) => handleFileUpload('screenshots', e.target.files)}
                  />
                  {uploadedMedia.screenshots.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {uploadedMedia.screenshots.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-32 object-cover rounded-lg border" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                            onClick={() => handleDeleteMedia('screenshots', idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                          <CardDescription>
                            {plan.description}
                            {plan.id === 'join' && <span className="block mt-1 text-xs">Auto-assigned to first available date &gt;7 days out</span>}
                            {plan.id === 'skip' && <span className="block mt-1 text-xs">Choose any date within next 7 days</span>}
                            {plan.id === 'relaunch' && <span className="block mt-1 text-xs">Auto-assigned to first available date &gt;30 days out</span>}
                          </CardDescription>
                        </div>
                        <div className="text-2xl font-bold">${plan.price}<span className="text-sm font-normal text-muted-foreground"> / USD</span></div>
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
                  By clicking submit, you'll be redirected to complete payment. After successful payment,
                  your product will be scheduled for launch.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              Save as Draft
            </Button>
            {step < 5 && (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
            {step === 5 && (
              <Button onClick={handleSubmit}>
                Proceed to Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Submit;
