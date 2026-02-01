-- Create content_formats table for configurable marketing formats
CREATE TABLE public.content_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  template_hint text,
  product_count integer DEFAULT 1,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create marketing_content table for actual content pieces
CREATE TABLE public.marketing_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id uuid REFERENCES public.content_formats(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamp with time zone,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create junction table for products featured in marketing content
CREATE TABLE public.marketing_content_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.marketing_content(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  commentary text,
  UNIQUE(content_id, product_id)
);

-- Create junction table for builders featured in marketing content
CREATE TABLE public.marketing_content_builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.marketing_content(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  position integer DEFAULT 0,
  commentary text,
  UNIQUE(content_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.content_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_content_builders ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_formats
CREATE POLICY "Content formats are viewable by everyone" ON public.content_formats
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage content formats" ON public.content_formats
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for marketing_content
CREATE POLICY "Marketing content is viewable by everyone" ON public.marketing_content
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage marketing content" ON public.marketing_content
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for marketing_content_products
CREATE POLICY "Marketing content products are viewable by everyone" ON public.marketing_content_products
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage marketing content products" ON public.marketing_content_products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS policies for marketing_content_builders
CREATE POLICY "Marketing content builders are viewable by everyone" ON public.marketing_content_builders
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage marketing content builders" ON public.marketing_content_builders
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Insert the default content formats
INSERT INTO public.content_formats (name, slug, description, template_hint, product_count, sort_order) VALUES
  ('Launch of the Day', 'launch-of-the-day', 'One featured product with short commentary.', 'Highlight what makes this product special and why it deserves the spotlight.', 1, 1),
  ('3 Products You Missed This Week', 'products-you-missed', 'Weekly roundup of three launches.', 'Brief commentary for each product covering what it does and why it matters.', 3, 2),
  ('Builders to Watch', 'builders-to-watch', 'Spotlight on a founder or team and their product.', 'Share the story behind the builder and their journey with their product.', 1, 3),
  ('Trending on Launch', 'trending-on-launch', 'Products with high votes, views, or recent activity.', 'Showcase momentum with vote counts, engagement stats, or notable milestones.', 3, 4),
  ('New & Noteworthy', 'new-and-noteworthy', 'Recently launched products with early traction.', 'Focus on fresh launches that are gaining attention quickly.', 3, 5),
  ('Hidden Gems', 'hidden-gems', 'High-quality products with low visibility.', 'Underrated products that deserve more attention.', 3, 6);