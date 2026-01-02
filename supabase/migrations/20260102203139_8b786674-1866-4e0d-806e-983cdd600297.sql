-- Create tags table for predefined tags (admin managed)
CREATE TABLE public.product_tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create product-tag mapping table
CREATE TABLE public.product_tag_map (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES public.product_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Create collections table for editorial curated collections
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  intro_copy TEXT,
  is_auto_update BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create collection-product mapping table
CREATE TABLE public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- Create category intro copy table for SEO descriptions
CREATE TABLE public.category_intro_copy (
  category_id INTEGER PRIMARY KEY REFERENCES public.product_categories(id) ON DELETE CASCADE,
  intro_copy TEXT,
  meta_description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tag intro copy table for SEO descriptions
CREATE TABLE public.tag_intro_copy (
  tag_id INTEGER PRIMARY KEY REFERENCES public.product_tags(id) ON DELETE CASCADE,
  intro_copy TEXT,
  meta_description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_tag_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_intro_copy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_intro_copy ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_tags (public read, admin write)
CREATE POLICY "Tags are viewable by everyone" ON public.product_tags
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage tags" ON public.product_tags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for product_tag_map (public read, owner/admin write)
CREATE POLICY "Product tags are viewable by everyone" ON public.product_tag_map
  FOR SELECT USING (true);

CREATE POLICY "Product owners can manage tags" ON public.product_tag_map
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE products.id = product_tag_map.product_id 
      AND products.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all product tags" ON public.product_tag_map
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for collections (public read, admin write)
CREATE POLICY "Collections are viewable by everyone" ON public.collections
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage collections" ON public.collections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for collection_products (public read, admin write)
CREATE POLICY "Collection products are viewable by everyone" ON public.collection_products
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage collection products" ON public.collection_products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for category_intro_copy (public read, admin write)
CREATE POLICY "Category intro copy is viewable by everyone" ON public.category_intro_copy
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage category intro copy" ON public.category_intro_copy
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for tag_intro_copy (public read, admin write)
CREATE POLICY "Tag intro copy is viewable by everyone" ON public.tag_intro_copy
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage tag intro copy" ON public.tag_intro_copy
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert initial tags based on common AI app categories
INSERT INTO public.product_tags (name, slug) VALUES
  ('AI Writing', 'ai-writing'),
  ('AI Coding', 'ai-coding'),
  ('AI Image Generation', 'ai-image-generation'),
  ('AI Video', 'ai-video'),
  ('AI Audio', 'ai-audio'),
  ('AI Chat', 'ai-chat'),
  ('AI Automation', 'ai-automation'),
  ('AI Analytics', 'ai-analytics'),
  ('AI Research', 'ai-research'),
  ('AI Customer Support', 'ai-customer-support'),
  ('AI Sales', 'ai-sales'),
  ('AI Marketing', 'ai-marketing'),
  ('AI SEO', 'ai-seo'),
  ('AI Social Media', 'ai-social-media'),
  ('AI Email', 'ai-email'),
  ('Open Source', 'open-source'),
  ('API First', 'api-first'),
  ('Self-Hosted', 'self-hosted'),
  ('Freemium', 'freemium'),
  ('Mobile App', 'mobile-app'),
  ('Chrome Extension', 'chrome-extension'),
  ('Slack Integration', 'slack-integration'),
  ('GPT-4 Powered', 'gpt-4-powered'),
  ('Claude Powered', 'claude-powered'),
  ('Gemini Powered', 'gemini-powered');

-- Create indexes for performance
CREATE INDEX idx_product_tag_map_product_id ON public.product_tag_map(product_id);
CREATE INDEX idx_product_tag_map_tag_id ON public.product_tag_map(tag_id);
CREATE INDEX idx_product_tags_slug ON public.product_tags(slug);
CREATE INDEX idx_collections_slug ON public.collections(slug);
CREATE INDEX idx_collection_products_collection_id ON public.collection_products(collection_id);
CREATE INDEX idx_collection_products_product_id ON public.collection_products(product_id);