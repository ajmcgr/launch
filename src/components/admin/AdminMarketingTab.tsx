import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Settings } from 'lucide-react';
import { ContentFormatManager } from './marketing/ContentFormatManager';
import { AutoSurfacedContent } from './marketing/AutoSurfacedContent';

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
  return (
    <div className="space-y-6">
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            This Week
          </TabsTrigger>
          <TabsTrigger value="formats" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <AutoSurfacedContent />
        </TabsContent>

        <TabsContent value="formats" className="space-y-4">
          <ContentFormatManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminMarketingTab;
