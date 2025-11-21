-- Add coupon code fields to products table
ALTER TABLE public.products
ADD COLUMN coupon_code TEXT,
ADD COLUMN coupon_description TEXT;