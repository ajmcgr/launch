import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ContentFormatManager } from './marketing/ContentFormatManager';
import { ContentList } from './marketing/ContentList';
import { ContentCreator } from './marketing/ContentCreator';

export interface ContentFormat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  template_hint: string | null;
  product_count: number;
  is_active: boolean;
  sort_order: number;
}

export interface MarketingContent {
  id: string;
  format_id: string;
  title: string;
  body: string | null;
  status: string;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  content_formats?: ContentFormat;
}

const AdminMarketingTab = () => {
  const [showCreator, setShowCreator] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat | null>(null);
  const [editingContent, setEditingContent] = useState<MarketingContent | null>(null);
  const queryClient = useQueryClient();

  const { data: formats, isLoading: formatsLoading } = useQuery({
    queryKey: ['content-formats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_formats')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as ContentFormat[];
    },
  });

  const { data: content, isLoading: contentLoading } = useQuery({
    queryKey: ['marketing-content'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_content')
        .select(`
          *,
          content_formats(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MarketingContent[];
    },
  });

  const handleCreateNew = (format: ContentFormat) => {
    setSelectedFormat(format);
    setEditingContent(null);
    setShowCreator(true);
  };

  const handleEditContent = (content: MarketingContent) => {
    const format = formats?.find(f => f.id === content.format_id);
    setSelectedFormat(format || null);
    setEditingContent(content);
    setShowCreator(true);
  };

  const handleCloseCreator = () => {
    setShowCreator(false);
    setSelectedFormat(null);
    setEditingContent(null);
  };

  if (showCreator && selectedFormat) {
    return (
      <ContentCreator
        format={selectedFormat}
        editingContent={editingContent}
        onClose={handleCloseCreator}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="formats" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Formats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {/* Quick Create Section */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Content</CardTitle>
              <CardDescription>Choose a format to create marketing content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {formats?.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => handleCreateNew(format)}
                    className="text-left p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {format.name}
                      </h3>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-muted-foreground">{format.description}</p>
                    <Badge variant="outline" className="mt-2">
                      {format.product_count} product{format.product_count !== 1 ? 's' : ''}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content List */}
          <ContentList 
            content={content || []} 
            isLoading={contentLoading}
            onEdit={handleEditContent}
          />
        </TabsContent>

        <TabsContent value="formats" className="space-y-4">
          <ContentFormatManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketingTab;
