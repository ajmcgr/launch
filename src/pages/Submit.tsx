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
import { X, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES, PRICING_PLANS } from '@/lib/constants';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

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
      couponCode: '',
      couponDescription: '',
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
      
      console.log('User authenticated:', session.user.id);
      setUser(session.user);
      
      // Load product for rescheduling if productId is present
      if (productIdParam) {
        await loadProductForReschedule(productIdParam, session.user.id);
      } else if (draftId) {
        // Load draft if draftId is present
        await loadDraft(draftId);
      }
    };
    
    checkAuth();
  }, [navigate, draftId, productIdParam]);

  const loadProductForReschedule = async (id: string, userId: string) => {
    setIsLoadingProduct(true);
    console.log('=== LOADING PRODUCT FOR RESCHEDULE ===');
    console.log('Product ID:', id, 'User ID:', userId);
    
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
        .eq('owner_id', userId)
        .single();

      if (error) throw error;
      console.log('Product loaded:', product);

      // Get the order to determine the plan
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('plan')
        .eq('product_id', id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      console.log('Order query result:', { order, orderError });
      
      if (order && order.plan) {
        const planValue = order.plan as 'join' | 'skip' | 'relaunch';
        console.log('Setting existingPlan to:', planValue);
        console.log('Setting isRescheduling to: true');
        setExistingPlan(planValue);
        setIsRescheduling(true);
        
        // Force formData.plan to match the paid plan
        const categories = product.product_category_map?.map((c: any) => c.product_categories.name) || [];
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
          categories,
          slug: product.slug || '',
          couponCode: product.coupon_code || '',
          couponDescription: product.coupon_description || '',
          plan: planValue, // Use the order plan
          selectedDate: product.launch_date || null,
        });

        setUploadedMedia(media);
        setProductStatus(product.status);
        
        console.log('=== RESCHEDULE SETUP COMPLETE ===');
        console.log('Final state - existingPlan:', planValue, 'isRescheduling: true');
        
        toast.success(`Product loaded - ${PRICING_PLANS.find(p => p.id === planValue)?.name} plan`);
      } else {
        console.log('No order found - treating as new submission');
        // No order means this is a draft, not a paid product
        const categories = product.product_category_map?.map((c: any) => c.product_categories.name) || [];
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
          categories,
          slug: product.slug || '',
          couponCode: product.coupon_code || '',
          couponDescription: product.coupon_description || '',
          plan: 'join',
          selectedDate: product.launch_date || null,
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
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

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

      console.log('Order found:', order);

      // If product is scheduled and has an order, treat it as rescheduling
      if (product.status === 'scheduled' && order && order.plan) {
        const planValue = order.plan as 'join' | 'skip' | 'relaunch';
        setExistingPlan(planValue);
        setIsRescheduling(true);
        console.log('Setting up reschedule mode - plan:', planValue);
      }

      // Store product status
      setProductStatus(product.status);

      const media = {
        icon: product.product_media?.find((m: any) => m.type === 'icon')?.url,
        thumbnail: product.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
        screenshots: product.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
      };

      // Set form data with the paid plan pre-selected
      const paidPlan = (order?.plan as 'join' | 'skip' | 'relaunch') || 'join';
      
      setFormData({
        name: product.name || '',
        tagline: product.tagline || '',
        url: product.domain_url || '',
        description: product.description || '',
        categories: product.product_category_map?.map((c: any) => c.product_categories.name) || [],
        slug: product.slug || '',
        couponCode: product.coupon_code || '',
        couponDescription: product.coupon_description || '',
        plan: paidPlan,
        selectedDate: product.launch_date || null,
      });
      
      console.log('Form data set with plan:', paidPlan);
      
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

      console.log('Saving draft with user ID:', user.id);
      if (!skipNavigation) toast.info('Saving draft...');

      // Use existing productId or create new product
      let currentProductId = productId;

      if (!currentProductId) {
        // Create new product
        console.log('Creating new product with owner_id:', user.id);
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
      if (isRescheduling && productId && formData.selectedDate) {
        try {
          // First save all the product edits
          toast.info('Saving changes...');
          const savedProductId = await handleSaveDraft(true);
          
          if (!savedProductId) {
            toast.error('Failed to save product changes');
            return;
          }

          const selectedDate = new Date(formData.selectedDate);
          const now = new Date();
          const daysOut = Math.ceil((selectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Validate based on plan type
          if (existingPlan === 'join' && daysOut < 7) {
            toast.error('Join The Line requires scheduling at least 7 days in advance');
            return;
          }

          if (existingPlan === 'relaunch' && daysOut < 30) {
            toast.error('Relaunch requires scheduling at least 30 days in advance');
            return;
          }

          if (selectedDate <= now && existingPlan !== 'skip') {
            toast.error('Launch date must be in the future');
            return;
          }

          const { error } = await supabase
            .from('products')
            .update({
              status: 'scheduled',
              launch_date: selectedDate.toISOString(),
            })
            .eq('id', productId);

          if (error) throw error;

          toast.success('Launch rescheduled successfully');
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
      
      // Handle free plan separately
      if (formData.plan === 'free') {
        try {
          console.log('Starting free launch process for product:', savedProductId);
          console.log('User ID:', session.user.id);
          
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

          // Check if there's capacity to launch immediately today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const { count: todayCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .in('status', ['scheduled', 'launched'])
            .gte('launch_date', today.toISOString())
            .lt('launch_date', tomorrow.toISOString());
          
          let launchDate: Date;
          let productStatus: string;
          let foundSlot = false;
          
          // If there's capacity today (less than 100 launches), launch immediately
          if ((todayCount || 0) < 100) {
            launchDate = new Date(); // Current time
            productStatus = 'launched';
            foundSlot = true;
          } else {
            // Otherwise, find next available slot
            for (let i = 1; i < 30; i++) {
              const checkDate = new Date(today);
              checkDate.setDate(checkDate.getDate() + i);
              checkDate.setHours(0, 0, 0, 0);
              
              const nextDay = new Date(checkDate);
              nextDay.setDate(nextDay.getDate() + 1);
              
              const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .in('status', ['scheduled', 'launched'])
                .gte('launch_date', checkDate.toISOString())
                .lt('launch_date', nextDay.toISOString());
              
              if ((count || 0) < 100) {
                launchDate = new Date(checkDate);
                launchDate.setHours(9, 0, 0, 0);
                productStatus = 'scheduled';
                foundSlot = true;
                break;
              }
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
          navigate('/my-products');
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
      // If user already has a paid plan, use it without requiring another payment
      if (hasExistingPlan && formData.plan !== 'free') {
        try {
          // Reuse existing order for this launch
          const existingOrder = existingOrders[0];
          
          // Create a new order entry referencing the same plan
          const { error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: session.user.id,
              product_id: savedProductId,
              plan: existingOrder.plan, // Use their existing plan
              stripe_session_id: existingOrder.stripe_session_id, // Reference original payment
            });

          if (orderError) throw orderError;

          // Update product status to scheduled
          const { error: updateError } = await supabase
            .from('products')
            .update({
              status: 'scheduled',
              launch_date: formData.selectedDate,
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
      
      // Handle new paid plans with Stripe checkout
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
              </>
            )}

            {step === 4 && (() => {
              const filteredPlans = isRescheduling && existingPlan 
                ? PRICING_PLANS.filter(plan => plan.id === existingPlan)
                : PRICING_PLANS;
              
              console.log('=== STEP 4 RENDER ===');
              console.log('isLoadingProduct:', isLoadingProduct);
              console.log('isRescheduling:', isRescheduling);
              console.log('existingPlan:', existingPlan);
              console.log('formData.plan:', formData.plan);
              console.log('Filtered plans:', filteredPlans.map(p => `${p.id} (${p.name})`));
              
              return (
                <div className="space-y-4">
                  {isLoadingProduct ? (
                    <div className="text-center py-8 text-muted-foreground">Loading product details...</div>
                  ) : (
                    <>
                      {isRescheduling && existingPlan && (
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium">
                            You've already purchased the <span className="font-bold">{PRICING_PLANS.find(p => p.id === existingPlan)?.name}</span> plan for this product. 
                            {existingPlan === 'skip' && ' You can choose any available date and time below.'}
                            {existingPlan === 'join' && ' Your launch date will be automatically assigned.'}
                            {existingPlan === 'relaunch' && ' Your relaunch date will be automatically assigned.'}
                          </p>
                        </div>
                      )}
                      {filteredPlans.map((plan) => {
                        const isPaidPlan = isRescheduling && plan.id === existingPlan;
                        const isSelected = formData.plan === plan.id;
                        return (
                          <Card
                            key={plan.id}
                            className={`transition-all ${
                              isPaidPlan || isSelected
                                ? 'border-primary ring-2 ring-primary bg-primary/5' 
                                : 'cursor-pointer hover:border-primary/50'
                            }`}
                            onClick={() => !isRescheduling && handleInputChange('plan', plan.id)}
                          >
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="flex items-center gap-2">
                                    {plan.name}
                                    {isPaidPlan && (
                                      <span className="text-xs font-normal px-2 py-1 rounded-full bg-primary text-primary-foreground">
                                        Your Plan
                                      </span>
                                    )}
                                    {!isRescheduling && isSelected && (
                                      <span className="text-xs font-normal px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                        Selected
                                      </span>
                                    )}
                                  </CardTitle>
                                  <CardDescription>
                                    {plan.description}
                                    {plan.id === 'join' && <span className="block mt-1 text-xs">Auto-assigned to first available date &gt;7 days out</span>}
                                    {plan.id === 'skip' && <span className="block mt-1 text-xs">Choose any available date within the calendar year</span>}
                                    {plan.id === 'relaunch' && <span className="block mt-1 text-xs">Auto-assigned to first available date &gt;30 days out</span>}
                                  </CardDescription>
                                </div>
                                <div className="text-2xl font-bold">${plan.price}<span className="text-sm font-normal text-muted-foreground"> / USD</span></div>
                              </div>
                            </CardHeader>
                          </Card>
                        );
                      })}
                  </>
                )}
                
                {!isLoadingProduct && formData.plan === 'skip' && (
                  <div className="space-y-2 mt-6">
                    <Label>Select Launch Date & Time *</Label>
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
                              const d = new Date(formData.selectedDate);
                              return !isNaN(d.getTime()) 
                                ? format(d, "PPP 'at' h:mm a")
                                : "Pick your launch date and time";
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
                              // Set default time to 9 AM PST
                              const newDate = new Date(date);
                              newDate.setHours(9, 0, 0, 0);
                              handleInputChange('selectedDate', newDate.toISOString());
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
                          <Label className="text-sm mb-2 block">Launch Time (PST)</Label>
                          <Input
                            type="time"
                            value={
                              formData.selectedDate 
                                ? (() => {
                                    try {
                                      const d = new Date(formData.selectedDate);
                                      return isNaN(d.getTime()) ? '09:00' : format(d, 'HH:mm');
                                    } catch {
                                      return '09:00';
                                    }
                                  })()
                                : '09:00'
                            }
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              let date: Date;
                              
                              if (formData.selectedDate) {
                                try {
                                  date = new Date(formData.selectedDate);
                                  if (isNaN(date.getTime())) {
                                    date = new Date();
                                  }
                                } catch {
                                  date = new Date();
                                }
                              } else {
                                date = new Date();
                              }
                              
                              date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              
                              // Validate the date before saving
                              if (!isNaN(date.getTime())) {
                                handleInputChange('selectedDate', date.toISOString());
                              }
                            }}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Choose the exact time your product goes live
                          </p>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <p className="text-sm text-muted-foreground">
                      Select any available date within the calendar year
                    </p>
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
                      if (!isNaN(d.getTime())) {
                        return (
                          <p className="text-sm">
                            Launch Date: {format(d, "PPP 'at' h:mm a")}
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
                  : formData.plan === 'free' 
                    ? 'Submit Launch' 
                    : 'Proceed to Payment'
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
