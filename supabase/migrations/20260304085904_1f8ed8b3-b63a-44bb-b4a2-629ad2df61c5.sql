
-- Create stack_items table for technology entries
CREATE TABLE public.stack_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stack_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view stack items
CREATE POLICY "Stack items are viewable by everyone"
    ON public.stack_items FOR SELECT
    USING (true);

-- Authenticated users can create stack items (for custom entries)
CREATE POLICY "Authenticated users can create stack items"
    ON public.stack_items FOR INSERT
    WITH CHECK (true);

-- Only admins can update/delete
CREATE POLICY "Only admins can update stack items"
    ON public.stack_items FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete stack items"
    ON public.stack_items FOR DELETE
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Create product_stack_map table
CREATE TABLE public.product_stack_map (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    stack_item_id INTEGER REFERENCES public.stack_items(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (product_id, stack_item_id)
);

-- Enable RLS
ALTER TABLE public.product_stack_map ENABLE ROW LEVEL SECURITY;

-- Everyone can view
CREATE POLICY "Product stack is viewable by everyone"
    ON public.product_stack_map FOR SELECT
    USING (true);

-- Product owners can manage
CREATE POLICY "Product owners can manage stack"
    ON public.product_stack_map FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.products
        WHERE products.id = product_stack_map.product_id AND products.owner_id = auth.uid()
    ));

-- Create indexes
CREATE INDEX idx_product_stack_map_product ON public.product_stack_map(product_id);
CREATE INDEX idx_product_stack_map_stack ON public.product_stack_map(stack_item_id);
CREATE INDEX idx_stack_items_slug ON public.stack_items(slug);

-- Pre-populate default stack items
INSERT INTO public.stack_items (name, slug) VALUES
    ('OpenAI', 'openai'),
    ('Claude', 'claude'),
    ('Supabase', 'supabase'),
    ('Firebase', 'firebase'),
    ('Stripe', 'stripe'),
    ('Vercel', 'vercel'),
    ('Next.js', 'nextjs'),
    ('React', 'react'),
    ('Python', 'python'),
    ('Lovable', 'lovable'),
    ('Bubble', 'bubble'),
    ('Flutter', 'flutter'),
    ('Replicate', 'replicate'),
    ('Runway', 'runway'),
    ('ElevenLabs', 'elevenlabs')
ON CONFLICT (name) DO NOTHING;
