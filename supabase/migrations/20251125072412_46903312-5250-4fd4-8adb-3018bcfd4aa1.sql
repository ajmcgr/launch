-- Update the orders table check constraint to allow 'free' plan
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_plan_check;
ALTER TABLE orders ADD CONSTRAINT orders_plan_check CHECK (plan = ANY (ARRAY['free'::text, 'join'::text, 'skip'::text, 'relaunch'::text]));