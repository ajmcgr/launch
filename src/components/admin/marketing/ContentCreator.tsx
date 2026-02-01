import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, Search, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ContentFormat, MarketingContent } from '../AdminMarketingTab';

interface ContentCreatorProps {
  format: ContentFormat;
  editingContent: MarketingContent | null;
  onClose: () => void;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
}

interface Builder {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
}

interface SelectedProduct {
  product: Product;
  commentary: string;
}

interface SelectedBuilder {
  builder: Builder;
  commentary: string;
}

export const ContentCreator = ({ format, editingContent, onClose }: ContentCreatorProps) => {
  const [title, setTitle] = useState(editingContent?.title || '');
  const [body, setBody] = useState(editingContent?.body || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    (editingContent?.status as 'draft' | 'published' | 'archived') || 'draft'
  );
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [selectedBuilders, setSelectedBuilders] = useState<SelectedBuilder[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [builderSearch, setBuilderSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showBuilderSearch, setShowBuilderSearch] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch products for search
  const { data: searchProducts } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: async () => {
      if (!productSearch.trim()) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, tagline')
        .ilike('name', `%${productSearch}%`)
        .eq('status', 'launched')
        .limit(10);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: productSearch.length > 1,
  });

  // Fetch builders for search
  const { data: searchBuilders } = useQuery({
    queryKey: ['builder-search', builderSearch],
    queryFn: async () => {
      if (!builderSearch.trim()) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, avatar_url')
        .or(`username.ilike.%${builderSearch}%,name.ilike.%${builderSearch}%`)
        .limit(10);
      
      if (error) throw error;
      return data as Builder[];
    },
    enabled: builderSearch.length > 1,
  });

  // Load existing content products and builders when editing
  useEffect(() => {
    if (editingContent) {
      loadExistingRelations();
    }
  }, [editingContent]);

  const loadExistingRelations = async () => {
    if (!editingContent) return;

    // Load products
    const { data: productRelations } = await supabase
      .from('marketing_content_products')
      .select(`
        commentary,
        products(id, name, slug, tagline)
      `)
      .eq('content_id', editingContent.id)
      .order('position', { ascending: true });

    if (productRelations) {
      const products = productRelations.map((r: any) => ({
        product: r.products,
        commentary: r.commentary || '',
      }));
      setSelectedProducts(products);
    }

    // Load builders
    const { data: builderRelations } = await supabase
      .from('marketing_content_builders')
      .select(`
        commentary,
        users(id, username, name, avatar_url)
      `)
      .eq('content_id', editingContent.id)
      .order('position', { ascending: true });

    if (builderRelations) {
      const builders = builderRelations.map((r: any) => ({
        builder: r.users,
        commentary: r.commentary || '',
      }));
      setSelectedBuilders(builders);
    }
  };

  const saveContent = useMutation({
    mutationFn: async (publishNow: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const contentData = {
        format_id: format.id,
        title,
        body: body || null,
        status: publishNow ? 'published' : status,
        published_at: publishNow ? new Date().toISOString() : (status === 'published' ? editingContent?.published_at || new Date().toISOString() : null),
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let contentId: string;

      if (editingContent) {
        const { error } = await supabase
          .from('marketing_content')
          .update(contentData)
          .eq('id', editingContent.id);
        
        if (error) throw error;
        contentId = editingContent.id;

        // Delete existing relations
        await supabase.from('marketing_content_products').delete().eq('content_id', contentId);
        await supabase.from('marketing_content_builders').delete().eq('content_id', contentId);
      } else {
        const { data, error } = await supabase
          .from('marketing_content')
          .insert(contentData)
          .select('id')
          .single();
        
        if (error) throw error;
        contentId = data.id;
      }

      // Insert product relations
      if (selectedProducts.length > 0) {
        const productInserts = selectedProducts.map((sp, index) => ({
          content_id: contentId,
          product_id: sp.product.id,
          position: index,
          commentary: sp.commentary || null,
        }));

        const { error: prodError } = await supabase
          .from('marketing_content_products')
          .insert(productInserts);
        
        if (prodError) throw prodError;
      }

      // Insert builder relations
      if (selectedBuilders.length > 0) {
        const builderInserts = selectedBuilders.map((sb, index) => ({
          content_id: contentId,
          user_id: sb.builder.id,
          position: index,
          commentary: sb.commentary || null,
        }));

        const { error: builderError } = await supabase
          .from('marketing_content_builders')
          .insert(builderInserts);
        
        if (builderError) throw builderError;
      }

      return publishNow;
    },
    onSuccess: (publishNow) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-content'] });
      toast.success(publishNow ? 'Content published!' : 'Content saved');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save content');
      console.error(error);
    },
  });

  const addProduct = (product: Product) => {
    if (selectedProducts.some(sp => sp.product.id === product.id)) {
      toast.error('Product already added');
      return;
    }
    setSelectedProducts(prev => [...prev, { product, commentary: '' }]);
    setProductSearch('');
    setShowProductSearch(false);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(sp => sp.product.id !== productId));
  };

  const updateProductCommentary = (productId: string, commentary: string) => {
    setSelectedProducts(prev => prev.map(sp => 
      sp.product.id === productId ? { ...sp, commentary } : sp
    ));
  };

  const addBuilder = (builder: Builder) => {
    if (selectedBuilders.some(sb => sb.builder.id === builder.id)) {
      toast.error('Builder already added');
      return;
    }
    setSelectedBuilders(prev => [...prev, { builder, commentary: '' }]);
    setBuilderSearch('');
    setShowBuilderSearch(false);
  };

  const removeBuilder = (builderId: string) => {
    setSelectedBuilders(prev => prev.filter(sb => sb.builder.id !== builderId));
  };

  const updateBuilderCommentary = (builderId: string, commentary: string) => {
    setSelectedBuilders(prev => prev.map(sb => 
      sb.builder.id === builderId ? { ...sb, commentary } : sb
    ));
  };

  const isBuilderFormat = format.slug === 'builders-to-watch';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{editingContent ? 'Edit' : 'Create'}: {format.name}</h2>
          <p className="text-sm text-muted-foreground">{format.description}</p>
        </div>
      </div>

      {format.template_hint && (
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> {format.template_hint}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a catchy title"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your content here..."
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: 'draft' | 'published' | 'archived') => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products & Builders */}
        <div className="space-y-6">
          {/* Products Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Featured Products</CardTitle>
                  <CardDescription>
                    Select {format.product_count} product{format.product_count !== 1 ? 's' : ''} to feature
                  </CardDescription>
                </div>
                <Badge variant={selectedProducts.length >= format.product_count ? 'default' : 'secondary'}>
                  {selectedProducts.length}/{format.product_count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductSearch(true);
                      }}
                      onFocus={() => setShowProductSearch(true)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                {showProductSearch && searchProducts && searchProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {searchProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addProduct(product)}
                        className="w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                      >
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{product.tagline}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Products */}
              <div className="space-y-3">
                {selectedProducts.map((sp, index) => (
                  <div key={sp.product.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{sp.product.name}</p>
                        <p className="text-sm text-muted-foreground">{sp.product.tagline}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeProduct(sp.product.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Add commentary for this product..."
                      value={sp.commentary}
                      onChange={(e) => updateProductCommentary(sp.product.id, e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Builders Section (for relevant formats) */}
          {isBuilderFormat && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Featured Builders</CardTitle>
                <CardDescription>Spotlight builders to feature</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Builder Search */}
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search builders..."
                        value={builderSearch}
                        onChange={(e) => {
                          setBuilderSearch(e.target.value);
                          setShowBuilderSearch(true);
                        }}
                        onFocus={() => setShowBuilderSearch(true)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  {showBuilderSearch && searchBuilders && searchBuilders.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchBuilders.map((builder) => (
                        <button
                          key={builder.id}
                          onClick={() => addBuilder(builder)}
                          className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                        >
                          <img 
                            src={builder.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${builder.username}`}
                            alt={builder.username}
                            className="h-8 w-8 rounded-full"
                          />
                          <div>
                            <p className="font-medium">{builder.name || builder.username}</p>
                            <p className="text-sm text-muted-foreground">@{builder.username}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Builders */}
                <div className="space-y-3">
                  {selectedBuilders.map((sb) => (
                    <div key={sb.builder.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={sb.builder.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sb.builder.username}`}
                            alt={sb.builder.username}
                            className="h-10 w-10 rounded-full"
                          />
                          <div>
                            <p className="font-medium">{sb.builder.name || sb.builder.username}</p>
                            <p className="text-sm text-muted-foreground">@{sb.builder.username}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeBuilder(sb.builder.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Add commentary for this builder..."
                        value={sb.commentary}
                        onChange={(e) => updateBuilderCommentary(sb.builder.id, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="secondary"
          onClick={() => saveContent.mutate(false)}
          disabled={saveContent.isPending || !title.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button 
          onClick={() => saveContent.mutate(true)}
          disabled={saveContent.isPending || !title.trim()}
        >
          <Send className="h-4 w-4 mr-2" />
          Publish
        </Button>
      </div>
    </div>
  );
};
