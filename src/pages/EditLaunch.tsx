import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Upload, X, Lock, RefreshCw } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

const editSchema = z.object({
  tagline: z.string().trim().min(1, 'Tagline is required').max(200, 'Tagline too long'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description too long'),
  domain_url: z.string().trim().url('Must be a valid URL').max(500),
  twitter_handle: z.string().trim().max(50).optional().or(z.literal('')),
  videoUrl: z.string().trim().url('Must be a valid URL').max(500).optional().or(z.literal('')),
});

interface MediaState {
  icon?: string;
  thumbnail?: string;
  screenshots: string[];
  videoUrl: string;
}

const EditLaunch = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
  }, []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<any>(null);

  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [domainUrl, setDomainUrl] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaState>({ screenshots: [], videoUrl: '' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!productId) return;
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, user, authLoading]);

  const loadProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_media(url, type),
        product_category_map(product_categories(name))
      `)
      .eq('id', productId)
      .single();

    if (error || !data) {
      toast.error('Product not found');
      navigate('/my-products');
      return;
    }
    if (data.owner_id !== user?.id) {
      toast.error('You do not have permission to edit this product');
      navigate('/my-products');
      return;
    }
    if (data.status !== 'launched') {
      // Drafts and scheduled go to Submit flow
      navigate(`/submit?draft=${data.id}&step=1`);
      return;
    }

    setProduct(data);
    setTagline(data.tagline || '');
    setDescription(data.description || '');
    setDomainUrl(data.domain_url || '');
    setTwitterHandle((data as any).twitter_handle || '');
    setCategories(
      (data.product_category_map || []).map((c: any) => c.product_categories?.name).filter(Boolean)
    );
    setMedia({
      icon: data.product_media?.find((m: any) => m.type === 'icon')?.url,
      thumbnail: data.product_media?.find((m: any) => m.type === 'thumbnail')?.url,
      screenshots: data.product_media?.filter((m: any) => m.type === 'screenshot').map((m: any) => m.url) || [],
      videoUrl: data.product_media?.find((m: any) => m.type === 'video')?.url || '',
    });
    setLoading(false);
  };

  const handleUpload = async (type: 'icon' | 'thumbnail' | 'screenshots', files: FileList | null) => {
    if (!files || !user) return;
    try {
      const urls = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > 5 * 1024 * 1024) throw new Error('File must be under 5MB');
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${type}/${Math.random()}.${fileExt}`;
          const { error } = await supabase.storage.from('product-media').upload(fileName, file);
          if (error) throw error;
          return supabase.storage.from('product-media').getPublicUrl(fileName).data.publicUrl;
        })
      );
      if (type === 'screenshots') {
        setMedia((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...urls] }));
      } else {
        setMedia((prev) => ({ ...prev, [type]: urls[0] }));
      }
      toast.success('Uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    }
  };

  const handleRemoveScreenshot = (idx: number) => {
    setMedia((prev) => ({ ...prev, screenshots: prev.screenshots.filter((_, i) => i !== idx) }));
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : prev.length >= 3 ? prev : [...prev, cat]
    );
  };

  const handleSave = async () => {
    const parsed = editSchema.safeParse({
      tagline,
      description,
      domain_url: domainUrl,
      twitter_handle: twitterHandle,
      videoUrl: media.videoUrl,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || 'Please fix validation errors');
      return;
    }
    if (categories.length === 0) {
      toast.error('Pick at least one category');
      return;
    }

    setSaving(true);
    try {
      // 1. Update products row
      const { error: updateErr } = await supabase
        .from('products')
        .update({
          tagline: parsed.data.tagline,
          description: parsed.data.description,
          domain_url: parsed.data.domain_url,
          twitter_handle: parsed.data.twitter_handle || null,
        } as any)
        .eq('id', productId!);
      if (updateErr) throw updateErr;

      // 2. Replace media
      await supabase.from('product_media').delete().eq('product_id', productId!);
      const inserts: any[] = [];
      if (media.icon) inserts.push({ product_id: productId, type: 'icon', url: media.icon });
      if (media.thumbnail) inserts.push({ product_id: productId, type: 'thumbnail', url: media.thumbnail });
      media.screenshots.forEach((url) => inserts.push({ product_id: productId, type: 'screenshot', url }));
      if (media.videoUrl) inserts.push({ product_id: productId, type: 'video', url: media.videoUrl });
      if (inserts.length) await supabase.from('product_media').insert(inserts);

      // 3. Replace categories
      await supabase.from('product_category_map').delete().eq('product_id', productId!);
      const { data: cats } = await supabase
        .from('product_categories')
        .select('id, name')
        .in('name', categories);
      if (cats?.length) {
        await supabase
          .from('product_category_map')
          .insert(cats.map((c) => ({ product_id: productId!, category_id: c.id })));
      }

      toast.success('Launch updated');
      navigate(`/launch/${product.slug}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/my-products"><ArrowLeft className="h-4 w-4 mr-2" />Back to my launches</Link>
        </Button>

        <div className="max-w-3xl">
          <h1 className="font-reckless text-3xl mb-2">Edit launch</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Update your listing's content. To change the name, launch date, or get featured again, use{' '}
            <Link to="/pricing" className="text-primary underline underline-offset-2">Relaunch</Link>.
          </p>

          {/* Locked fields notice */}
          <Card className="p-4 mb-6 bg-muted/30 border-border">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-2 flex-1">
                <p className="font-medium">Locked fields</p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div><span className="text-xs uppercase tracking-wide">Name</span><div className="text-foreground">{product.name}</div></div>
                  <div><span className="text-xs uppercase tracking-wide">Launch date</span><div className="text-foreground">{product.launch_date ? new Date(product.launch_date).toLocaleDateString() : '—'}</div></div>
                </div>
                <Button variant="link" size="sm" asChild className="px-0 h-auto">
                  <Link to="/pricing"><RefreshCw className="h-3 w-3 mr-1" />Relaunch to change these</Link>
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline <span className="text-muted-foreground text-xs">({tagline.length}/200)</span></Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">({description.length}/5000)</span></Label>
              <Textarea id="description" rows={8} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Website URL</Label>
                <Input id="domain" type="url" value={domainUrl} onChange={(e) => setDomainUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X / Twitter handle <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="twitter" value={twitterHandle} onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ''))} placeholder="yourhandle" />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label>Categories <span className="text-muted-foreground text-xs">(pick up to 3)</span></Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = categories.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Media */}
            <div className="space-y-3">
              <Label>Icon</Label>
              <div className="flex items-center gap-3">
                {media.icon && <img src={media.icon} alt="icon" className="w-16 h-16 rounded-lg object-cover border border-border" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload('icon', e.target.files)} />
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted">
                    <Upload className="h-4 w-4" />Replace icon
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Thumbnail</Label>
              <div className="flex items-center gap-3">
                {media.thumbnail && <img src={media.thumbnail} alt="thumb" className="w-32 h-20 rounded-md object-cover border border-border" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload('thumbnail', e.target.files)} />
                  <span className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted">
                    <Upload className="h-4 w-4" />Replace thumbnail
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Screenshots</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {media.screenshots.map((url, i) => (
                  <div key={url + i} className="relative group">
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-32 rounded-md object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => handleRemoveScreenshot(i)}
                      className="absolute top-1 right-1 p-1 rounded bg-background/90 border border-border opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove screenshot"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="cursor-pointer inline-block">
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload('screenshots', e.target.files)} />
                <span className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted">
                  <Upload className="h-4 w-4" />Add screenshots
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video">Video URL <span className="text-muted-foreground text-xs">(YouTube, Loom, etc.)</span></Label>
              <Input id="video" type="url" value={media.videoUrl} onChange={(e) => setMedia((p) => ({ ...p, videoUrl: e.target.value }))} placeholder="https://youtube.com/..." />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save changes
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/my-products">Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditLaunch;
