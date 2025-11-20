-- TryLaunch.ai Database Schema - Clean Setup
-- This will drop existing tables and recreate everything from scratch

-- Drop existing tables (cascade will remove all dependent objects)
DROP TABLE IF EXISTS public.product_makers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.product_category_map CASCADE;
DROP TABLE IF EXISTS public.product_media CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
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
CREATE TABLE public.product_categories (
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
    ('Data analysis tools');

-- Create products table
CREATE TABLE public.products (
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
CREATE TABLE public.product_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('thumbnail', 'icon', 'screenshot', 'video')) NOT NULL,
    url TEXT NOT NULL
);

-- Create product_category_map table
CREATE TABLE public.product_category_map (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES public.product_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

-- Create votes table
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    value INTEGER CHECK (value IN (1, -1)) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Create follows table
CREATE TABLE public.follows (
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    followed_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id != followed_id)
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    stripe_session_id TEXT NOT NULL,
    plan TEXT CHECK (plan IN ('join', 'skip', 'relaunch')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_makers table
CREATE TABLE public.product_makers (
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
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create view for product vote counts
CREATE OR REPLACE VIEW product_vote_counts AS
SELECT 
    product_id,
    SUM(value) as net_votes,
    COUNT(*) as total_votes
FROM votes
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

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- RLS Policies for products table
CREATE POLICY "Products are viewable by everyone"
    ON public.products FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create products"
    ON public.products FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Product owners can update their products"
    ON public.products FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Product owners can delete their products"
    ON public.products FOR DELETE
    USING (auth.uid() = owner_id);

-- RLS Policies for product_media table
CREATE POLICY "Product media viewable by everyone"
    ON public.product_media FOR SELECT
    USING (true);

CREATE POLICY "Product owners can manage media"
    ON public.product_media FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_media.product_id
            AND products.owner_id = auth.uid()
        )
    );

-- RLS Policies for product_category_map table
CREATE POLICY "Product categories viewable by everyone"
    ON public.product_category_map FOR SELECT
    USING (true);

CREATE POLICY "Product owners can manage categories"
    ON public.product_category_map FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_category_map.product_id
            AND products.owner_id = auth.uid()
        )
    );

-- RLS Policies for votes table
CREATE POLICY "Votes are viewable by everyone"
    ON public.votes FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can vote"
    ON public.votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
    ON public.votes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
    ON public.votes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for follows table
CREATE POLICY "Follows are viewable by everyone"
    ON public.follows FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);

-- RLS Policies for orders table
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for product_makers table
CREATE POLICY "Product makers viewable by everyone"
    ON public.product_makers FOR SELECT
    USING (true);

CREATE POLICY "Product owners can manage makers"
    ON public.product_makers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE products.id = product_makers.product_id
            AND products.owner_id = auth.uid()
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_products_owner ON public.products(owner_id);
CREATE INDEX idx_products_launch_date ON public.products(launch_date);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_votes_product ON public.votes(product_id);
CREATE INDEX idx_votes_user ON public.votes(user_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_followed ON public.follows(followed_id);
