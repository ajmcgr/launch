import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tags, FolderOpen, Library, X } from 'lucide-react';

interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  intro_copy?: string;
  is_auto_update: boolean;
  updated_at: string;
}

interface CategoryIntroCopy {
  category_id: number;
  intro_copy?: string;
  meta_description?: string;
}

export const AdminSeoTab = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tags');
  
  // Tags state
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  // Collections state
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [collectionProducts, setCollectionProducts] = useState<Array<{ id: string; name: string; position: number }>>([]);

  // Fetch tags
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_tags')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Fetch collections
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Collection[];
    },
  });

  // Fetch categories with intro copy
  const { data: categories } = useQuery({
    queryKey: ['admin-categories-seo'],
    queryFn: async () => {
      const { data: cats, error: catsError } = await supabase
        .from('product_categories')
        .select('id, name')
        .order('name');
      if (catsError) throw catsError;

      const { data: introCopies } = await supabase
        .from('category_intro_copy')
        .select('*');

      const copyMap = new Map(introCopies?.map(ic => [ic.category_id, ic]) || []);

      return cats?.map(cat => ({
        ...cat,
        intro_copy: copyMap.get(cat.id)?.intro_copy,
        meta_description: copyMap.get(cat.id)?.meta_description,
      }));
    },
  });

  // Fetch all products for collection management
  const { data: allProducts } = useQuery({
    queryKey: ['admin-all-products-seo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug')
        .eq('status', 'launched')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await supabase
        .from('product_tags')
        .insert({ name, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      setNewTagName('');
      toast.success('Tag created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create tag: ${error.message}`);
    },
  });

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async (tag: Tag) => {
      const slug = tag.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await supabase
        .from('product_tags')
        .update({ name: tag.name, slug, description: tag.description })
        .eq('id', tag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      setEditingTag(null);
      toast.success('Tag updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update tag: ${error.message}`);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const { error } = await supabase
        .from('product_tags')
        .delete()
        .eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast.success('Tag deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete tag: ${error.message}`);
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const { error } = await supabase
        .from('collections')
        .insert({ name, slug });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      setNewCollectionName('');
      toast.success('Collection created');
    },
    onError: (error: any) => {
      toast.error(`Failed to create collection: ${error.message}`);
    },
  });

  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async (collection: Partial<Collection> & { id: string }) => {
      const slug = collection.name ? collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;
      const { error } = await supabase
        .from('collections')
        .update({ 
          name: collection.name, 
          slug,
          description: collection.description,
          intro_copy: collection.intro_copy,
          is_auto_update: collection.is_auto_update,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      setEditingCollection(null);
      toast.success('Collection updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update collection: ${error.message}`);
    },
  });

  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast.success('Collection deleted');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete collection: ${error.message}`);
    },
  });

  // Update category intro copy mutation
  const updateCategoryIntroCopyMutation = useMutation({
    mutationFn: async ({ categoryId, introCopy, metaDescription }: { categoryId: number; introCopy: string; metaDescription: string }) => {
      const { error } = await supabase
        .from('category_intro_copy')
        .upsert({ 
          category_id: categoryId, 
          intro_copy: introCopy,
          meta_description: metaDescription,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories-seo'] });
      toast.success('Category SEO updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update category: ${error.message}`);
    },
  });

  // Load collection products
  const loadCollectionProducts = async (collectionId: string) => {
    const { data, error } = await supabase
      .from('collection_products')
      .select('product_id, position, products(id, name)')
      .eq('collection_id', collectionId)
      .order('position');

    if (!error && data) {
      setCollectionProducts(data.map(cp => ({
        id: (cp.products as any).id,
        name: (cp.products as any).name,
        position: cp.position,
      })));
    }
  };

  // Add product to collection
  const addProductToCollection = async (collectionId: string, productId: string) => {
    const maxPosition = collectionProducts.reduce((max, p) => Math.max(max, p.position), 0);
    const { error } = await supabase
      .from('collection_products')
      .insert({ 
        collection_id: collectionId, 
        product_id: productId,
        position: maxPosition + 1,
      });

    if (error) {
      toast.error('Failed to add product');
    } else {
      loadCollectionProducts(collectionId);
      setSelectedProductId('');
      toast.success('Product added');
    }
  };

  // Remove product from collection
  const removeProductFromCollection = async (collectionId: string, productId: string) => {
    const { error } = await supabase
      .from('collection_products')
      .delete()
      .eq('collection_id', collectionId)
      .eq('product_id', productId);

    if (error) {
      toast.error('Failed to remove product');
    } else {
      loadCollectionProducts(collectionId);
      toast.success('Product removed');
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Collections
          </TabsTrigger>
        </TabsList>

        {/* Tags Tab */}
        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <CardTitle>Manage Tags</CardTitle>
              <CardDescription>Create and manage predefined tags for products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new tag */}
              <div className="flex gap-2">
                <Input
                  placeholder="New tag name..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                />
                <Button 
                  onClick={() => createTagMutation.mutate(newTagName)}
                  disabled={!newTagName.trim() || createTagMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </div>

              {/* Tags list */}
              <div className="flex flex-wrap gap-2">
                {tags?.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                    <span className="text-sm">{tag.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setEditingTag(tag)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => deleteTagMutation.mutate(tag.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit tag dialog */}
          <Dialog open={!!editingTag} onOpenChange={() => setEditingTag(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingTag?.name || ''}
                    onChange={(e) => setEditingTag(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingTag?.description || ''}
                    onChange={(e) => setEditingTag(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Optional description for SEO..."
                  />
                </div>
                <Button 
                  onClick={() => editingTag && updateTagMutation.mutate(editingTag)}
                  disabled={updateTagMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category SEO</CardTitle>
              <CardDescription>Add intro copy and meta descriptions for category pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories?.map((category) => (
                  <CategorySeoEditor 
                    key={category.id}
                    category={category}
                    onSave={(introCopy, metaDescription) => 
                      updateCategoryIntroCopyMutation.mutate({ 
                        categoryId: category.id, 
                        introCopy, 
                        metaDescription 
                      })
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections">
          <Card>
            <CardHeader>
              <CardTitle>Editorial Collections</CardTitle>
              <CardDescription>Create curated collections of products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new collection */}
              <div className="flex gap-2">
                <Input
                  placeholder="New collection name..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
                <Button 
                  onClick={() => createCollectionMutation.mutate(newCollectionName)}
                  disabled={!newCollectionName.trim() || createCollectionMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              </div>

              {/* Collections list */}
              <div className="space-y-3">
                {collections?.map((collection) => (
                  <div key={collection.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{collection.name}</h4>
                        <p className="text-sm text-muted-foreground">/collections/{collection.slug}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCollection(collection);
                            loadCollectionProducts(collection.id);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCollectionMutation.mutate(collection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit collection dialog */}
          <Dialog open={!!editingCollection} onOpenChange={() => setEditingCollection(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingCollection?.name || ''}
                    onChange={(e) => setEditingCollection(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingCollection?.description || ''}
                    onChange={(e) => setEditingCollection(prev => prev ? { ...prev, description: e.target.value } : null)}
                    placeholder="Brief description for SEO..."
                  />
                </div>
                <div>
                  <Label>Intro Copy</Label>
                  <Textarea
                    value={editingCollection?.intro_copy || ''}
                    onChange={(e) => setEditingCollection(prev => prev ? { ...prev, intro_copy: e.target.value } : null)}
                    placeholder="Editorial intro paragraph (2-4 sentences)..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingCollection?.is_auto_update || false}
                    onCheckedChange={(checked) => setEditingCollection(prev => prev ? { ...prev, is_auto_update: checked } : null)}
                  />
                  <Label>Auto-update collection</Label>
                </div>

                {/* Products in collection */}
                <div>
                  <Label>Products</Label>
                  <div className="flex gap-2 mt-2">
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allProducts?.filter(p => !collectionProducts.some(cp => cp.id === p.id)).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => editingCollection && addProductToCollection(editingCollection.id, selectedProductId)}
                      disabled={!selectedProductId}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {collectionProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between bg-muted rounded-md px-3 py-2">
                        <span className="text-sm">{index + 1}. {product.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => editingCollection && removeProductFromCollection(editingCollection.id, product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => editingCollection && updateCollectionMutation.mutate(editingCollection)}
                  disabled={updateCollectionMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Category SEO Editor component
const CategorySeoEditor = ({ 
  category, 
  onSave 
}: { 
  category: { id: number; name: string; intro_copy?: string; meta_description?: string };
  onSave: (introCopy: string, metaDescription: string) => void;
}) => {
  const [introCopy, setIntroCopy] = useState(category.intro_copy || '');
  const [metaDescription, setMetaDescription] = useState(category.meta_description || '');
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{category.name}</h4>
          {(category.intro_copy || category.meta_description) && (
            <Badge variant="secondary" className="text-xs">SEO configured</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? 'Collapse' : 'Edit'}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div>
            <Label>Intro Copy (2-3 sentences)</Label>
            <Textarea
              value={introCopy}
              onChange={(e) => setIntroCopy(e.target.value)}
              placeholder="Write a brief, neutral intro for the category page..."
              rows={2}
            />
          </div>
          <div>
            <Label>Meta Description</Label>
            <Input
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO meta description (under 160 chars)..."
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/160</p>
          </div>
          <Button 
            size="sm"
            onClick={() => onSave(introCopy, metaDescription)}
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminSeoTab;
