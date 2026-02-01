import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface ContentFormat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template_hint: string | null;
  product_count: number;
  is_active: boolean;
  sort_order: number;
}

export const ContentFormatManager = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<ContentFormat | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_hint: '',
    product_count: 1,
    is_active: true,
  });
  const queryClient = useQueryClient();

  const { data: formats, isLoading } = useQuery({
    queryKey: ['all-content-formats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_formats')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ContentFormat[];
    },
  });

  const createFormat = useMutation({
    mutationFn: async (data: typeof formData) => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const maxOrder = formats?.reduce((max, f) => Math.max(max, f.sort_order), 0) || 0;
      
      const { error } = await supabase
        .from('content_formats')
        .insert({
          name: data.name,
          slug,
          description: data.description || null,
          template_hint: data.template_hint || null,
          product_count: data.product_count,
          is_active: data.is_active,
          sort_order: maxOrder + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-content-formats'] });
      queryClient.invalidateQueries({ queryKey: ['content-formats'] });
      toast.success('Format created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create format');
      console.error(error);
    },
  });

  const updateFormat = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('content_formats')
        .update({
          name: data.name,
          description: data.description || null,
          template_hint: data.template_hint || null,
          product_count: data.product_count,
          is_active: data.is_active,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-content-formats'] });
      queryClient.invalidateQueries({ queryKey: ['content-formats'] });
      toast.success('Format updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update format');
      console.error(error);
    },
  });

  const deleteFormat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_formats')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-content-formats'] });
      queryClient.invalidateQueries({ queryKey: ['content-formats'] });
      toast.success('Format deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete format');
      console.error(error);
    },
  });

  const handleOpenCreate = () => {
    setEditingFormat(null);
    setFormData({
      name: '',
      description: '',
      template_hint: '',
      product_count: 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (format: ContentFormat) => {
    setEditingFormat(format);
    setFormData({
      name: format.name,
      description: format.description || '',
      template_hint: format.template_hint || '',
      product_count: format.product_count,
      is_active: format.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingFormat(null);
    setFormData({
      name: '',
      description: '',
      template_hint: '',
      product_count: 1,
      is_active: true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (editingFormat) {
      updateFormat.mutate({ id: editingFormat.id, data: formData });
    } else {
      createFormat.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content Formats</CardTitle>
            <CardDescription>Manage configurable marketing content formats</CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Format
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {formats?.map((format) => (
            <div 
              key={format.id} 
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{format.name}</h3>
                    {!format.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{format.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">
                      {format.product_count} product{format.product_count !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-xs text-muted-foreground">/{format.slug}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(format)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this format?')) {
                      deleteFormat.mutate(format.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {formats?.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No formats configured yet
            </p>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFormat ? 'Edit Format' : 'Create Format'}</DialogTitle>
              <DialogDescription>
                {editingFormat ? 'Update the content format settings' : 'Add a new marketing content format'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Launch of the Day"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this format"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template_hint">Template Hint</Label>
                <Textarea
                  id="template_hint"
                  value={formData.template_hint}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_hint: e.target.value }))}
                  placeholder="Writing guidance for this format"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="product_count">Products to Feature</Label>
                <Input
                  id="product_count"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.product_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, product_count: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">Show this format in the content creator</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button 
                onClick={handleSubmit}
                disabled={createFormat.isPending || updateFormat.isPending}
              >
                {editingFormat ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
