-- TryLaunch.ai Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    twitter TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Insert default categories
INSERT INTO public.product_categories (name) VALUES
    ('Productivity'),
    ('Engineering & Development'),
    ('Design & Creative'),
    ('Finance'),
    ('Social & Community'),
    ('Marketing & Sales'),
    ('Health & Fitness'),
    ('Travel'),
    ('Platforms'),
    ('Product add-ons'),
    ('AI Agents'),
    ('Web3'),
    ('LLMs'),
    ('Physical Products'),
    ('Voice AI Tools'),
    ('Ecommerce'),
    ('No-code Platforms'),
    ('Data analysis tools')
ON CONFLICT (name) DO NOTHING;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain_url TEXT NOT NULL,
    launch_date TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('draft', 'scheduled', 'launched')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_media table
CREATE TABLE IF NOT EXISTS public.product_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('thumbnail', 'icon', 'screenshot', 'video')) NOT NULL,
    url TEXT NOT NULL
);

-- Create product_category_map table
CREATE TABLE IF NOT EXISTS public.product_category_map (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES public.product_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    value INTEGER CHECK (value IN (1, -1)) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    followed_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id != followed_id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    stripe_session_id TEXT NOT NULL,
    plan TEXT CHECK (plan IN ('join', 'skip', 'relaunch')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_makers table (for multiple makers per product)
CREATE TABLE IF NOT EXISTS public.product_makers (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, user_id)
);

-- Create function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create view for product vote counts
CREATE OR REPLACE VIEW public.product_vote_counts AS
SELECT 
    product_id,
    SUM(value) as net_votes
FROM public.votes
GROUP BY product_id;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_makers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for products table
CREATE POLICY "Published products are viewable by everyone"
    ON public.products FOR SELECT
    USING (status = 'launched' OR owner_id = auth.uid());

CREATE POLICY "Users can insert own products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own products"
    ON public.products FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own products"
    ON public.products FOR DELETE
    USING (auth.uid() = owner_id);

-- RLS Policies for product_media
CREATE POLICY "Product media viewable if product viewable"
    ON public.product_media FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id
            AND (status = 'launched' OR owner_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert media for own products"
    ON public.product_media FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update media for own products"
    ON public.product_media FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete media for own products"
    ON public.product_media FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND owner_id = auth.uid()
        )
    );

-- RLS Policies for product_category_map
CREATE POLICY "Category mappings viewable by everyone"
    ON public.product_category_map FOR SELECT
    USING (true);

CREATE POLICY "Users can insert categories for own products"
    ON public.product_category_map FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND owner_id = auth.uid()
        )
    );

-- RLS Policies for votes
CREATE POLICY "Votes viewable by everyone"
    ON public.votes FOR SELECT
    USING (true);

CREATE POLICY "Users can insert own votes"
    ON public.votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
    ON public.votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
    ON public.votes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Follows viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for product_makers
CREATE POLICY "Product makers viewable by everyone"
    ON public.product_makers FOR SELECT
    USING (true);

CREATE POLICY "Product owners can add makers"
    ON public.product_makers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND owner_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_owner ON public.products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_launch_date ON public.products(launch_date);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_votes_product ON public.votes(product_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON public.votes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows(followed_id);
CREATE INDEX IF NOT EXISTS idx_product_makers_product ON public.product_makers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_makers_user ON public.product_makers(user_id);
