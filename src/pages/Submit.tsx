import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, CalendarIcon, Plus, Zap } from 'lucide-react';
import { LanguageSelector } from '@/components/LanguageSelector';
import { PLATFORMS, Platform } from '@/components/PlatformIcons';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES, PRICING_PLANS, PLAN_FEATURE_LABELS } from '@/lib/constants';
import { PlanComparisonCard } from '@/components/PlanComparisonCard';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { usePass } from '@/hooks/use-pass';
import { PassOption } from '@/components/PassOption';

const PST_TIMEZONE = 'America/Los_Angeles';

// Get user's local timezone
const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return PST_TIMEZONE;
  }
};

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(100, 'Name too long'),
  tagline: z.string().trim().min(1, 'Tagline is required').max(200, 'Tagline too long'),
  url: z.string().trim().url('Invalid URL').max(500, 'URL too long'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description too long'),
  categories: z.array(z.string()).min(1, 'Select at least one category').max(3, 'Maximum 3 categories'),
  slug: z.string().trim().min(1, 'Slug is required').max(100, 'Slug too long').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  couponCode: z.string().trim().max(50, 'Coupon code too long').optional(),
  couponDescription: z.string().trim().max(200, 'Coupon description too long').optional(),
});

const Submit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');
  const productIdParam = searchParams.get('productId');
  const [user, setUser] = useState<any>(null);
  const [productId, setProductId] = useState<string | null>(draftId || productIdParam);
  const [productStatus, setProductStatus] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [existingPlan, setExistingPlan] = useState<'join' | 'skip' | 'relaunch' | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(!!productIdParam);
  const [step, setStep] = useState(() => {
    // If productId is present, we're rescheduling, go to step 4
    if (productIdParam) {
      return 4;
    }
    // Check URL parameter first
    const urlStep = searchParams.get('step');
    if (urlStep) {
      const stepNum = parseInt(urlStep);
      if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 4) {
        return stepNum;
      }
    }
    // Fall back to localStorage
    const saved = localStorage.getItem('submitStep');
    return saved ? parseInt(saved) : 1;
  });
  const [uploadedMedia, setUploadedMedia] = useState<{ icon?: string; thumbnail?: string; screenshots: string[]; videoUrl?: string }>(() => {
    const saved = localStorage.getItem('submitMedia');
    return saved ? JSON.parse(saved) : { screenshots: [], videoUrl: '' };
  });
  const [formData, setFormData] = useState(() => {
    // Don't load from localStorage if we're rescheduling (productIdParam is present)
    if (productIdParam) {
      return {
        name: '',
        tagline: '',
        url: '',
        description: '',
        categories: [] as string[],
        tags: [] as number[],
        platforms: [] as Platform[],
        languages: [] as string[],
        slug: '',
        couponCode: '',
        couponDescription: '',
        plan: 'join' as 'join' | 'skip' | 'relaunch',
        selectedDate: null as string | null,
      };
    }
    const saved = localStorage.getItem('submitFormData');
    return saved ? JSON.parse(saved) : {
      name: '',
      tagline: '',
      url: '',
      description: '',
      categories: [] as string[],
      tags: [] as number[],
      platforms: [] as Platform[],
      languages: [] as string[],
      slug: '',
      couponCode: '',
      couponDescription: '',
      plan: 'join' as 'join' | 'skip' | 'relaunch',
      selectedDate: null as string | null,
    };
  });
  const [availableTags, setAvailableTags] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  
  // Pass status
  const { data: passStatus } = usePass(user?.id);
  const hasActivePass = passStatus?.hasActivePass || false;

  // Save to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem('submitFormData', JSON.stringify(formData));
  }, [formData]);

  // Save to localStorage whenever uploadedMedia changes
  useEffect(() => {
    localStorage.setItem('submitMedia', JSON.stringify(uploadedMedia));
  }, [uploadedMedia]);

  // Fetch available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('product_tags')
        .select('id, name, slug')
        .order('name');
      if (data) {
        setAvailableTags(data);
      }
    };
    fetchTags();
  }, []);

  // Save to localStorage whenever step changes
  useEffect(() => {
    localStorage.setItem('submitStep', step.toString());
  }, [step]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        toast.error('Authentication error. Please sign in.');
        navigate('/auth?mode=signup');
        return;
      }
      
      if (!session) {
        toast.error('Please sign up to submit a product');
        navigate('/auth?mode=signup');
        return;
      }
      
      setUser(session.user);
      
      // Load product for rescheduling if productId is present
      if (productIdParam) {
        await loadProductForReschedule(productIdParam, session.user.id);
      } else if (draftId) {
        // Load draft if draftId is present
        await loadDraft(draftId);
      }
      // For new submissions, existingPlan remains null - users must choose and pay for a plan
    };
    
    checkAuth();
  }, [navigate, draftId, productIdParam]);

  const loadProductForReschedule = async (id: string, userId: string) => {
    setIsLoadingProduct(true);
    
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          product_media(url, type),
          product_category_map(
            product_categories(name)
          ),
          product_tag_map(tag_id)
        `)
        .eq('id', id)
        .eq('owner_id', userId)
        .single();

      if (error) throw error;

      // Get existing tags
      const existingTags = product.product_tag_map?.map((t: any) => t.tag_id) || [];

      // Get the order to determine the plan
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('plan')
        .eq('product_id', id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();
      
      if (order && order.plan) {
        const planValue = order.plan as 'join' | 'skip' | 'relaunch';
        
        // Force formData.plan to match the paid plan
        const categories = product.product_category_map?.map((c: any) => c.product_categories.name) || [];
        const media = {
          icon: product.product_media?.find((m: any) => m.type === 'icon')?.url,
          thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
          screenshots: product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
          videoUrl: product.product_media?.find((m: any) => m.type === 'video')?.url || '',
        };

        // Check if the original launch date is in the past - if so, clear it
        const originalLaunchDate = product.launch_date ? new Date(product.launch_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isLaunchDateInPast = originalLaunchDate && originalLaunchDate < today;

        // Set the form data with the paid plan FIRST
        setFormData({
          name: product.name || '',
          tagline: product.tagline || '',
          url: product.domain_url || '',
          description: product.description || '',
          categories,
          tags: existingTags,
          platforms: (product.platforms || []) as Platform[],
          languages: (product.languages || []) as string[],
          slug: product.slug || '',
          couponCode: product.coupon_code || '',
          couponDescription: product.coupon_description || '',
          plan: planValue, // Use the order plan
          selectedDate: isLaunchDateInPast ? null : product.launch_date, // Clear past dates
        });

        // Then set the reschedule state AFTER formData is set
        setExistingPlan(planValue);
        setIsRescheduling(true);
        setUploadedMedia(media);
        setProductStatus(product.status);
        
        toast.success(`Product loaded - ${PRICING_PLANS.find(p => p.id === planValue)?.name} plan`);
      } else {
        // No order means this is a draft, not a paid product
        const categories = product.product_category_map?.map((c: any) => c.product_categories.name) || [];
        const media = {
          icon: product.product_media?.find((m: any) => m.type === 'icon')?.url,
          thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
          screenshots: product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
          videoUrl: product.product_media?.find((m: any) => m.type === 'video')?.url || '',
        };

        // Check if the original launch date is in the past - if so, clear it
        const draftLaunchDate = product.launch_date ? new Date(product.launch_date) : null;
        const todayDraft = new Date();
        todayDraft.setHours(0, 0, 0, 0);
        const isDraftDateInPast = draftLaunchDate && draftLaunchDate < todayDraft;

        setFormData({
          name: product.name || '',
          tagline: product.tagline || '',
          url: product.domain_url || '',
          description: product.description || '',
          categories,
          tags: existingTags,
          platforms: (product.platforms || []) as Platform[],
          languages: (product.languages || []) as string[],
          slug: product.slug || '',
          couponCode: product.coupon_code || '',
          couponDescription: product.coupon_description || '',
          plan: 'join',
          selectedDate: isDraftDateInPast ? null : product.launch_date, // Clear past dates
        });

        setUploadedMedia(media);
        setProductStatus(product.status);
        toast.success('Draft loaded');
      }

    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Failed to load product');
      navigate('/my-products');
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const loadDraft = async (id: string) => {
    setIsLoadingProduct(true);
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          product_media(url, type),
          product_category_map(
            product_categories(name)
          ),
          product_tag_map(tag_id)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Get existing tags for this product
      const draftTags = product.product_tag_map?.map((t: any) => t.tag_id) || [];

      // Check if product is already launched
      if (product.status === 'launched') {
        toast.error('Cannot edit a launched product. Please create a new submission.');
        // Clear localStorage and navigate to fresh form
        localStorage.removeItem('submitFormData');
        localStorage.removeItem('submitMedia');
        localStorage.removeItem('submitStep');
        setProductId(null);
        setProductStatus(null);
        setFormData({
          name: '',
          tagline: '',
          url: '',
          description: '',
          categories: [],
          tags: [],
          platforms: [],
          languages: [],
          slug: '',
          couponCode: '',
          couponDescription: '',
          plan: 'join',
          selectedDate: null,
        });
        setUploadedMedia({ screenshots: [] });
        setStep(1);
        navigate('/submit', { replace: true });
        return;
      }

      // Check if there's an existing order (for rescheduling scheduled products)
      const { data: order } = await supabase
        .from('orders')
        .select('plan')
        .eq('product_id', id)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      // If product is scheduled and has an order, treat it as rescheduling
      if (product.status === 'scheduled' && order && order.plan) {
        const planValue = order.plan as 'join' | 'skip' | 'relaunch';
        setExistingPlan(planValue);
        setIsRescheduling(true);
      }

      // Store product status
      setProductStatus(product.status);

      const media = {
        icon: product.product_media?.find((m: any) => m.type === 'icon')?.url,
        thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
        screenshots: product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
        videoUrl: product.product_media?.find((m: any) => m.type === 'video')?.url || '',
      };

      // Set form data with the paid plan pre-selected
      const paidPlan = (order?.plan as 'join' | 'skip' | 'relaunch') || 'join';
      
      setFormData({
        name: product.name || '',
        tagline: product.tagline || '',
        url: product.domain_url || '',
        description: product.description || '',
        categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
        tags: draftTags,
        platforms: (product.platforms || []) as Platform[],
        languages: (product.languages || []) as string[],
        slug: product.slug || '',
        couponCode: product.coupon_code || '',
        couponDescription: product.coupon_description || '',
        plan: paidPlan,
        selectedDate: product.launch_date || null,
      });
      
      setUploadedMedia(media);
      toast.success(product.status === 'scheduled' && order ? 'Product loaded for rescheduling' : 'Draft loaded successfully');
    } catch (error) {
      console.error('Error loading draft:', error);
      toast.error('Failed to load draft');
    } finally {
      setIsLoadingProduct(false);
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

  const handleTagToggle = (tagId: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : prev.tags.length < 5
        ? [...prev.tags, tagId]
        : prev.tags
    }));
  };

  const handlePlatformToggle = (platformId: Platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleLanguageToggle = (langCode: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(langCode)
        ? prev.languages.filter(l => l !== langCode)
        : prev.languages.length < 5
        ? [...prev.languages, langCode]
        : prev.languages
    }));
  };

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;
    
    // Check if tag already exists
    const existingTag = availableTags.find(
      t => t.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existingTag) {
      toast.error('This tag already exists');
      return;
    }
    
    setIsCreatingTag(true);
    try {
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const { data, error } = await supabase
        .from('product_tags')
        .insert({ name: trimmedName, slug })
        .select('id, name, slug')
        .single();
      
      if (error) throw error;
      
      // Add to available tags and select it
      setAvailableTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      if (formData.tags.length < 5) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, data.id] }));
      }
      setNewTagName('');
      toast.success(`Tag "${trimmedName}" created!`);
    } catch (error: any) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
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
    // Validate based on current step
    if (step === 1) {
      const validation = productSchema.pick({ name: true, tagline: true, url: true }).safeParse({
        name: formData.name,
        tagline: formData.tagline,
        url: formData.url,
      });
      
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path[0]}: ${e.message}`).join(', ');
        toast.error(errors);
        return;
      }
    }
    
    if (step === 2) {
      if (!uploadedMedia.icon) {
        toast.error('Product icon is required');
        return;
      }
    }
    
    if (step === 3) {
      const validation = productSchema.pick({ description: true, categories: true, slug: true }).safeParse({
        description: formData.description,
        categories: formData.categories,
        slug: formData.slug,
      });
      
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path[0]}: ${e.message}`).join(', ');
        toast.error(errors);
        return;
      }
    }
    
    if (step === 4 && formData.plan === 'skip' && !formData.selectedDate) {
      toast.error('Please select a launch date and time');
      return;
    }
    
    // Skip step 4 (plan selection) and step 5 (review) if product is already scheduled
    if (step === 3 && productStatus === 'scheduled') {
      toast.info('Product is already scheduled. Saving changes...');
      handleSaveDraft();
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSaveDraft = async (skipNavigation = false) => {
    if (!user) {
      toast.error('Please log in to save your product');
      return null;
    }

    try {
      // Verify we have an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        toast.error('Your session has expired. Please log in again.');
        navigate('/auth?mode=signin');
        return null;
      }

      if (!skipNavigation) toast.info('Saving draft...');

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
            platforms: formData.platforms,
            languages: formData.languages,
            coupon_code: formData.couponCode || null,
            coupon_description: formData.couponDescription || null,
          })
          .select()
          .single();

        if (productError) {
          console.error('Product creation error:', productError);
          throw productError;
        }
        currentProductId = newProduct.id;
        setProductId(currentProductId);
      } else {
        // Update existing product
        const updateData: any = {
          name: formData.name || 'Untitled Product',
          tagline: formData.tagline,
          domain_url: formData.url,
          description: formData.description,
          slug: formData.slug,
          platforms: formData.platforms,
          languages: formData.languages,
          coupon_code: formData.couponCode || null,
          coupon_description: formData.couponDescription || null,
        };
        
        // If product is scheduled and being edited, keep it scheduled
        // Only drafts stay as drafts
        const { data: existingProduct } = await supabase
          .from('products')
          .select('status')
          .eq('id', currentProductId)
          .single();
        
        // Don't change status - keep draft as draft, scheduled as scheduled
        
        const { error: updateError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', currentProductId);

        if (updateError) throw updateError;
      }

      // Save media
      if (uploadedMedia.icon || uploadedMedia.thumbnail || uploadedMedia.screenshots.length > 0 || uploadedMedia.videoUrl) {
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
        if (uploadedMedia.videoUrl) {
          mediaInserts.push({ product_id: currentProductId, type: 'video', url: uploadedMedia.videoUrl });
        }

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

        // Save tags
        await supabase
          .from('product_tag_map')
          .delete()
          .eq('product_id', currentProductId);

        if (formData.tags.length > 0) {
          const tagMappings = formData.tags.map(tagId => ({
            product_id: currentProductId,
            tag_id: tagId,
          }));
          await supabase.from('product_tag_map').insert(tagMappings);
        }
      }

      if (!skipNavigation) {
        toast.success('Draft saved successfully!');
        navigate('/my-products');
      }
      
      return currentProductId;
    } catch (error: any) {
      console.error('Save draft error:', error);
      
      // Provide specific error messages
      if (error?.message?.includes('row-level security')) {
        toast.error('Authentication error. Please log in again.');
        navigate('/auth?mode=signin');
      } else if (error?.code === '23505') {
        toast.error('A product with this slug already exists. Please choose a different name.');
      } else {
        toast.error('Failed to save draft: ' + (error?.message || 'Unknown error'));
      }
      
      return null;
    }
  };

  const handleSaveButtonClick = () => {
    handleSaveDraft(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to submit your product');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in again');
        navigate('/auth?mode=signin');
        return;
      }

      // Handle rescheduling existing product
      if (isRescheduling && productId) {
        try {
          // First save all the product edits
          toast.info('Saving changes...');
          const savedProductId = await handleSaveDraft(true);
          
          if (!savedProductId) {
            toast.error('Failed to save product changes');
            return;
          }

          let launchDate: Date;
          
          // Auto-assign date for 'join' and 'relaunch' plans (all in PST)
          if (existingPlan === 'join') {
            // Launch immediately - 1 minute from now
            launchDate = new Date(Date.now() + 60000);
          } else if (existingPlan === 'relaunch') {
            // Find first available slot at least 30 days out in PST
            const nowPST = toZonedTime(new Date(), PST_TIMEZONE);
            nowPST.setDate(nowPST.getDate() + 30);
            nowPST.setHours(0, 1, 0, 0);
            launchDate = fromZonedTime(nowPST, PST_TIMEZONE);
          } else if (existingPlan === 'skip' && formData.selectedDate) {
            // User selected date for 'skip' plan - already in PST from the picker
            const selectedPST = toZonedTime(new Date(formData.selectedDate), PST_TIMEZONE);
            const nowPST = toZonedTime(new Date(), PST_TIMEZONE);
            if (selectedPST <= nowPST) {
              toast.error('Launch date must be in the future (PST)');
              return;
            }
            launchDate = fromZonedTime(selectedPST, PST_TIMEZONE);
          } else {
            toast.error('Please select a launch date');
            return;
          }

          // For Join plan, launch immediately; for others, schedule
          const launchStatus = existingPlan === 'join' ? 'launched' : 'scheduled';
          
          const { error } = await supabase
            .from('products')
            .update({
              status: launchStatus,
              launch_date: launchDate.toISOString(),
            })
            .eq('id', productId);

          if (error) throw error;

          const successMessage = launchStatus === 'launched' 
            ? 'Product launched successfully!' 
            : 'Launch rescheduled successfully';
          toast.success(successMessage);
          navigate('/my-products');
          return;
        } catch (error) {
          console.error('Reschedule error:', error);
          toast.error('Failed to reschedule launch');
          return;
        }
      }

      // Save product as draft first
      toast.info('Saving product...');
      const savedProductId = await handleSaveDraft(true);
      
      if (!savedProductId) {
        toast.error('Failed to save product');
        return;
      }

      // Check if user has an existing paid order
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .in('plan', ['join', 'skip', 'relaunch'])
        .order('created_at', { ascending: false })
        .limit(1);

      const hasExistingPlan = existingOrders && existingOrders.length > 0;
      const canReuseExistingPlan = hasExistingPlan && existingOrders[0].plan !== 'join';
      const isUpgrading = hasExistingPlan && existingOrders[0].plan === 'join' && formData.plan !== 'join';
      
      // Check if user has active Pass - bypass payment for non-advertising features
      if (hasActivePass && formData.plan !== 'free') {
        toast.info('Processing with Pass...');
        
        // Determine launch date
        let launchDate: Date;
        if (formData.plan === 'skip' && formData.selectedDate) {
          launchDate = new Date(formData.selectedDate);
        } else if (formData.plan === 'relaunch') {
          launchDate = new Date();
          launchDate.setDate(launchDate.getDate() + 30);
          launchDate.setHours(0, 1, 0, 0);
        } else {
          launchDate = new Date(Date.now() + 60000);
        }
        
        const launchStatus = formData.plan === 'join' ? 'launched' : 'scheduled';
        
        // Create order record referencing annual pass
        await supabase.from('orders').insert({
          user_id: session.user.id,
          product_id: savedProductId,
          plan: formData.plan,
          stripe_session_id: 'annual_access_' + Date.now(),
        });
        
        // Update product
        await supabase.from('products').update({
          status: launchStatus,
          launch_date: launchDate.toISOString(),
        }).eq('id', savedProductId);
        
        localStorage.removeItem('submitFormData');
        localStorage.removeItem('submitMedia');
        localStorage.removeItem('submitStep');
        
        toast.success(launchStatus === 'launched' ? 'Product launched!' : 'Product scheduled!');
        navigate('/my-products?success=true');
        return;
      }
      
      // Handle free plan separately
      if (formData.plan === 'free') {
        try {
          // Create Stripe customer for free plan users
          toast.info('Setting up your account...');
          const { data: customerData, error: customerError } = await supabase.functions.invoke('create-stripe-customer', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (customerError) {
            console.error('Customer creation error:', customerError);
            // Don't block the submission if customer creation fails
          } else {
            console.log('Stripe customer created:', customerData?.customerId);
          }
          
          // Create a free order entry (no Stripe session)
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: session.user.id,
              product_id: savedProductId,
              plan: 'free',
              stripe_session_id: 'free_launch', // Special identifier for free launches
            })
            .select();

          if (orderError) {
            console.error('Order insert error:', orderError);
            throw orderError;
          }
          
          console.log('Order created successfully:', orderData);

          // Free launches can launch same-day if there's capacity
          const now = new Date();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          let launchDate: Date;
          let productStatus: string = 'scheduled';
          let foundSlot = false;
          
          // Free launches start from today (day 0) - launch immediately if capacity available
          for (let i = 0; i < 60; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() + i);
            checkDate.setHours(0, 0, 0, 0);
            
            const nextDay = new Date(checkDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            // Count ALL scheduled/launched products for that day
            const { count: totalCount } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .in('status', ['scheduled', 'launched'])
              .gte('launch_date', checkDate.toISOString())
              .lt('launch_date', nextDay.toISOString());
            
            // Count PAID launches scheduled for that day (skip, join, relaunch)
            const { data: paidOrders } = await supabase
              .from('orders')
              .select('product_id')
              .in('plan', ['skip', 'join', 'relaunch']);
            
            const paidProductIds = paidOrders?.map(o => o.product_id).filter(Boolean) || [];
            
            const { count: paidCount } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .in('status', ['scheduled', 'launched'])
              .in('id', paidProductIds.length > 0 ? paidProductIds : ['no-match'])
              .gte('launch_date', checkDate.toISOString())
              .lt('launch_date', nextDay.toISOString());
            
            // Free launches only get remaining capacity after paid launches
            // Daily capacity is 100, free launches use what's left
            const freeCapacityUsed = (totalCount || 0) - (paidCount || 0);
            const freeCapacityLimit = 50; // Max free launches per day
            const totalCapacity = 100;
            
            // Free launch can go if: total < 100 AND free launches haven't exceeded their limit
            if ((totalCount || 0) < totalCapacity && freeCapacityUsed < freeCapacityLimit) {
              launchDate = new Date(checkDate);
              // If launching today, launch now; otherwise schedule for midnight
              if (i === 0) {
                launchDate = new Date(now.getTime() + 60000); // 1 minute from now
                productStatus = 'launched'; // Launch immediately
              } else {
                launchDate.setHours(0, 1, 0, 0);
              }
              foundSlot = true;
              break;
            }
          }
          
          if (!foundSlot) {
            toast.error('No available launch slots in the next 30 days. Please try again later.');
            return;
          }

          // Update product status to scheduled/live with assigned date
          const { data: updateData, error: updateError } = await supabase
            .from('products')
            .update({
              status: productStatus,
              launch_date: launchDate.toISOString(),
            })
            .eq('id', savedProductId)
            .select();

          if (updateError) {
            console.error('Product update error:', updateError);
            throw updateError;
          }
          
          console.log('Product updated successfully:', updateData);

          // Clear form data
          localStorage.removeItem('submitFormData');
          localStorage.removeItem('submitMedia');
          localStorage.removeItem('submitStep');
          
          const message = productStatus === 'launched'
            ? 'Product launched successfully!'
            : `Product scheduled for free launch on ${launchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${launchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
          toast.success(message);
          navigate('/my-products?success=true');
          return;
        } catch (error: any) {
          console.error('Free launch error details:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            error
          });
          toast.error(`Failed to queue free launch: ${error?.message || 'Please try again.'}`);
          return;
        }
      }
      
      // Handle paid plans
      // If user has a paid plan that can be reused (skip/relaunch), use it without requiring another payment
      // If upgrading from 'join', go through payment for the new plan
      if (canReuseExistingPlan && formData.plan !== 'free') {
        try {
          // Reuse existing order for this launch
          const existingOrder = existingOrders[0];
          const planType = existingOrder.plan as 'join' | 'skip' | 'relaunch';
          
          // Auto-assign date based on plan type
          let launchDate: Date;
          if (planType === 'join') {
            // Auto-assign at least 7 days out
            launchDate = new Date();
            launchDate.setDate(launchDate.getDate() + 7);
            launchDate.setHours(0, 1, 0, 0);
          } else if (planType === 'relaunch') {
            // Auto-assign at least 30 days out
            launchDate = new Date();
            launchDate.setDate(launchDate.getDate() + 30);
            launchDate.setHours(0, 1, 0, 0);
          } else if (planType === 'skip' && formData.selectedDate) {
            // Use user-selected date
            launchDate = new Date(formData.selectedDate);
          } else {
            toast.error('Please select a launch date');
            return;
          }
          
          // Create a new order entry referencing the same plan
          const { error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: session.user.id,
              product_id: savedProductId,
              plan: planType,
              stripe_session_id: existingOrder.stripe_session_id, // Reference original payment
            });

          if (orderError) throw orderError;

          // Update product status to scheduled
          const { error: updateError } = await supabase
            .from('products')
            .update({
              status: 'scheduled',
              launch_date: launchDate.toISOString(),
            })
            .eq('id', savedProductId);

          if (updateError) throw updateError;

          // Clear form data
          localStorage.removeItem('submitFormData');
          localStorage.removeItem('submitMedia');
          localStorage.removeItem('submitStep');
          
          toast.success('Product scheduled using your existing plan!');
          navigate('/my-products');
          return;
        } catch (error) {
          console.error('Error using existing plan:', error);
          toast.error('Failed to schedule launch. Please try again.');
          return;
        }
      }
      
      // Handle new paid plans with Stripe checkout (including upgrades from 'join' to other plans)
      toast.info('Redirecting to payment...');
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          plan: formData.plan,
          selectedDate: formData.selectedDate,
          productId: savedProductId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout in same window
        window.location.href = data.url;
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
          <h1 className="text-4xl font-bold mb-2">
            {isRescheduling ? 'Reschedule Launch' : 'Submit Your Product'}
          </h1>
          <p className="text-muted-foreground">
            {isRescheduling ? 'Update your launch date' : 'Launch your product to thousands of founders'}
          </p>
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
                  <Label>Hero Image *</Label>
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
                    value={uploadedMedia.videoUrl || ''}
                    onChange={(e) => setUploadedMedia(prev => ({ ...prev, videoUrl: e.target.value }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Paste a YouTube video URL to showcase your product
                  </p>
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
                  <Label>Platforms *</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select which platforms your product is available on
                  </p>
                  <div className="flex flex-wrap gap-3 p-4 border rounded-md">
                    {PLATFORMS.map((platform) => (
                      <div key={platform.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`platform-${platform.id}`}
                          checked={formData.platforms.includes(platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                        />
                        <Label htmlFor={`platform-${platform.id}`} className="text-sm cursor-pointer">
                          {platform.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (Select up to 5)</Label>
                  <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-4 border rounded-md">
                    {availableTags.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={formData.tags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                          disabled={!formData.tags.includes(tag.id) && formData.tags.length >= 5}
                        />
                        <Label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                          {tag.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Create new tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={isCreatingTag || !newTagName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {isCreatingTag ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tags help users discover your product via search. Can't find a tag? Create one!
                  </p>
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
                <div className="space-y-2">
                  <Label htmlFor="couponCode">Discount Coupon Code (Optional)</Label>
                  <Input
                    id="couponCode"
                    value={formData.couponCode}
                    onChange={(e) => handleInputChange('couponCode', e.target.value)}
                    placeholder="SAVE20"
                    maxLength={50}
                  />
                  <p className="text-sm text-muted-foreground">
                    Offer a discount code to your customers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="couponDescription">Discount Description (Optional)</Label>
                  <Input
                    id="couponDescription"
                    value={formData.couponDescription}
                    onChange={(e) => handleInputChange('couponDescription', e.target.value)}
                    placeholder="Get 20% off your first month"
                    maxLength={100}
                  />
                  <p className="text-sm text-muted-foreground">
                    Describe what the coupon offers
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>App Languages</Label>
                  <LanguageSelector
                    selectedLanguages={formData.languages}
                    onToggle={handleLanguageToggle}
                    maxSelections={5}
                  />
                </div>
              </>
            )}

            {step === 4 && (() => {
              // Allow upgrading from 'join' plan to paid plans
              // Only restrict if user has a paid plan ('skip')
              const isPaidPlan = existingPlan === 'skip';
              const canUpgrade = existingPlan === 'join'; // Allow upgrade from free 'join' plan
              
              // Filter out relaunch plan - users should use the other three options
              const availablePlans = PRICING_PLANS.filter(plan => plan.id !== 'relaunch');
              
              const filteredPlans = isPaidPlan
                ? availablePlans.filter(plan => plan.id === existingPlan)
                : availablePlans;
              
              return (
                <div className="space-y-6">
                  {isLoadingProduct ? (
                    <div className="text-center py-8 text-muted-foreground">Loading product details...</div>
                  ) : (
                    <>
                      {/* Social proof banner */}
                      {!isPaidPlan && (
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <p className="text-sm font-medium">
                            <span className="text-primary">87% of top launches</span> use paid promotion plans
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Get 5-10x more visibility with social & newsletter promotion
                          </p>
                        </div>
                      )}
                      
                      {isPaidPlan && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <p className="text-sm font-medium">
                            You've already purchased the <span className="font-bold">{PRICING_PLANS.find(p => p.id === existingPlan)?.name}</span> plan. 
                            You can choose any available date and time below.
                          </p>
                        </div>
                      )}
                      {canUpgrade && (
                        <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                          <p className="text-sm font-medium">
                            You currently have the <span className="font-bold">Launch Lite</span> plan. Upgrade to <span className="font-bold">Launch</span> for newsletter feature + choose your date.
                          </p>
                        </div>
                      )}
                      {hasActivePass && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium">
                            <span className="font-bold">Pass Active</span> — All launch options are included at no additional cost.
                          </p>
                        </div>
                      )}
                      
                      {/* Plan cards grid - 3 columns with Launch in center */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Reorder: Free | Launch (center) | Launch Lite */}
                        {['free', 'skip', 'join'].map((planId) => {
                          const plan = filteredPlans.find(p => p.id === planId);
                          if (!plan) return null;
                          
                          const isCurrentPaidPlan = isPaidPlan && plan.id === existingPlan;
                          const isSelected = formData.plan === plan.id;
                          const isDisabled = isPaidPlan && !isCurrentPaidPlan;
                          
                          return (
                            <PlanComparisonCard
                              key={plan.id}
                              plan={plan}
                              isSelected={isSelected}
                              isDisabled={isDisabled}
                              isCurrentPlan={isCurrentPaidPlan}
                              hasActivePass={hasActivePass}
                              onClick={() => handleInputChange('plan', plan.id)}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Comparison hint */}
                      {!isPaidPlan && formData.plan === 'free' && (
                        <div className="text-center p-4 border border-dashed rounded-lg bg-muted/20">
                          <p className="text-sm text-muted-foreground">
                            💡 <span className="font-medium">Tip:</span> Launch Lite ($9) gets you social promotion to 5K+ followers
                          </p>
                        </div>
                      )}
                      
                      {/* Pass Option - only show if not already active */}
                      {!hasActivePass && !isPaidPlan && (
                        <div className="mt-4 pt-6 border-t">
                          <p className="text-sm text-muted-foreground mb-4">Launching multiple products?</p>
                          <PassOption />
                        </div>
                      )}
                  </>
                )}
                
                {!isLoadingProduct && formData.plan === 'skip' && (
                  <div className="space-y-4 mt-6">
                    {/* Launch Now Option */}
                    <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Launch Now</h4>
                          <p className="text-sm text-muted-foreground">Go live immediately</p>
                        </div>
                        <Button 
                          variant="default"
                          onClick={() => {
                            // Set launch time to now (will trigger immediately when scheduler runs)
                            const now = new Date();
                            handleInputChange('selectedDate', now.toISOString());
                          }}
                          className="shrink-0"
                        >
                          Launch Now
                        </Button>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or schedule for later</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Launch Date & Time</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Schedule in your timezone ({getUserTimezone()}) - launches happen at midnight PST on the selected date
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.selectedDate && (() => {
                              try {
                                const date = new Date(formData.selectedDate);
                                const now = new Date();
                                // Check if it's "launch now" (within 5 mins of current time)
                                if (Math.abs(date.getTime() - now.getTime()) < 5 * 60 * 1000) {
                                  return "Launching immediately";
                                }
                                // Show in user's local timezone
                                return format(date, "PPP 'at' h:mm a") + ` (${getUserTimezone().split('/').pop()?.replace('_', ' ')})`;
                              } catch {
                                return "Pick your launch date and time";
                              }
                            })() || "Pick your launch date and time"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.selectedDate ? new Date(formData.selectedDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Create a new date at midnight PST on the selected day
                                // User sees the date they picked, but launch happens at 00:01 PST
                                const year = date.getFullYear();
                                const month = date.getMonth();
                                const day = date.getDate();
                                
                                // Create date at 00:01 PST
                                const pstDate = new Date(year, month, day, 0, 1, 0, 0);
                                const utcDate = fromZonedTime(pstDate, PST_TIMEZONE);
                                handleInputChange('selectedDate', utcDate.toISOString());
                              }
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const endOfYear = new Date(today.getFullYear(), 11, 31);
                              return date < today || date > endOfYear;
                            }}
                            initialFocus
                            className="pointer-events-auto"
                          />
                          <div className="p-3 border-t">
                            <Label className="text-sm mb-2 block">Launch Time (optional)</Label>
                            <Input
                              type="time"
                              value={
                                formData.selectedDate 
                                  ? (() => {
                                      try {
                                        const pstDate = toZonedTime(new Date(formData.selectedDate), PST_TIMEZONE);
                                        return isNaN(pstDate.getTime()) ? '00:01' : format(pstDate, 'HH:mm');
                                      } catch {
                                        return '00:01';
                                      }
                                    })()
                                  : '00:01'
                              }
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':');
                                let pstDate: Date;
                                
                                if (formData.selectedDate) {
                                  try {
                                    pstDate = toZonedTime(new Date(formData.selectedDate), PST_TIMEZONE);
                                    if (isNaN(pstDate.getTime())) {
                                      pstDate = toZonedTime(new Date(), PST_TIMEZONE);
                                    }
                                  } catch {
                                    pstDate = toZonedTime(new Date(), PST_TIMEZONE);
                                  }
                                } else {
                                  pstDate = toZonedTime(new Date(), PST_TIMEZONE);
                                }
                                
                                pstDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                const utcDate = fromZonedTime(pstDate, PST_TIMEZONE);
                                
                                if (!isNaN(utcDate.getTime())) {
                                  handleInputChange('selectedDate', utcDate.toISOString());
                                }
                              }}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Time in PST/PDT (Pacific Time)
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  )}
                </div>
              );
            })()}

            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h3 className="font-semibold">Product: {formData.name}</h3>
                  <p className="text-sm text-muted-foreground">{formData.tagline}</p>
                  <p className="text-sm">Categories: {formData.categories.join(', ')}</p>
                  <p className="text-sm">Plan: {PRICING_PLANS.find(p => p.id === formData.plan)?.name}</p>
                  {formData.selectedDate && (() => {
                    try {
                      const d = new Date(formData.selectedDate);
                      const now = new Date();
                      if (!isNaN(d.getTime())) {
                        // Check if launching now (within 5 mins)
                        if (Math.abs(d.getTime() - now.getTime()) < 5 * 60 * 1000) {
                          return (
                            <p className="text-sm font-medium text-primary">
                              🚀 Launching immediately after submission
                            </p>
                          );
                        }
                        const pstDate = toZonedTime(d, PST_TIMEZONE);
                        return (
                          <p className="text-sm">
                            Launch Date: {format(pstDate, "PPP 'at' h:mm a")} PST
                          </p>
                        );
                      }
                    } catch {
                      // Invalid date, don't display
                    }
                    return null;
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.plan === 'free' 
                    ? 'By clicking submit, your product will be queued for free launch. It will be scheduled after paid launches.'
                    : 'By clicking submit, you\'ll be redirected to complete payment. After successful payment, your product will be scheduled for launch.'}
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
            <Button variant="outline" onClick={handleSaveButtonClick}>
              Save
            </Button>
            {step < 5 && (
              <Button onClick={handleNext}>
                Next
              </Button>
            )}
            {step === 5 && (
              <Button onClick={handleSubmit}>
                {isRescheduling 
                  ? 'Reschedule Launch' 
                  : 'Submit to Launch'
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Submit;
