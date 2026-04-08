INSERT INTO public.product_categories (name) VALUES ('Video') ON CONFLICT (name) DO NOTHING;
