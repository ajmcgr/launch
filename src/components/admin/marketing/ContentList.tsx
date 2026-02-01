import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Pencil, Trash2, Eye, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { MarketingContent, ContentFormat } from '../AdminMarketingTab';

interface ContentListProps {
  content: MarketingContent[];
  isLoading: boolean;
  onEdit: (content: MarketingContent) => void;
}

export const ContentList = ({ content, isLoading, onEdit }: ContentListProps) => {
  const queryClient = useQueryClient();

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_content')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-content'] });
      toast.success('Content deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete content');
      console.error(error);
    },
  });

  const copyToClipboard = async (item: MarketingContent) => {
    const text = `${item.title}\n\n${item.body || ''}`;
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-600">Published</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Content</CardTitle>
        <CardDescription>All marketing content pieces</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {content.map((item) => (
            <div 
              key={item.id} 
              className="flex items-start justify-between p-4 border rounded-lg hover:border-muted-foreground/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{item.title}</h3>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {item.content_formats?.name || 'Unknown format'}
                </p>
                {item.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.body}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Created {format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                  {item.published_at && (
                    <span>Published {format(new Date(item.published_at), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => copyToClipboard(item)}
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEdit(item)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this content?')) {
                      deleteContent.mutate(item.id);
                    }
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {content.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No content created yet. Choose a format above to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
