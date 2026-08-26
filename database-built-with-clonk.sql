-- Adds the "Built With Clonk" collection + stack item, and seeds it with
-- random launched products. Idempotent — safe to re-run.

-- 1) Stack item
INSERT INTO public.stack_items (slug, name)
SELECT 'clonk', 'Clonk'
WHERE NOT EXISTS (SELECT 1 FROM public.stack_items WHERE slug = 'clonk');

-- 2) Collection row, cloned from an existing Built With collection so all
--    columns (owner, visibility, defaults) match the rest of the set.
INSERT INTO public.user_collections (user_id, name, slug, description, is_public)
SELECT c.user_id,
       'Built With Clonk',
       'built-with-clonk',
       'Discover the best products built with Clonk.',
       COALESCE(c.is_public, true)
FROM public.user_collections c
WHERE c.slug = 'built-with-lovable'
  AND NOT EXISTS (SELECT 1 FROM public.user_collections WHERE slug = 'built-with-clonk')
LIMIT 1;

-- 3) Seed ~25 random launched products into the Clonk stack map
DO $$
DECLARE
  v_stack_id INT;
  v_have     INT;
  v_min      INT := 25;
BEGIN
  SELECT id INTO v_stack_id FROM public.stack_items WHERE slug = 'clonk' LIMIT 1;

  SELECT COUNT(*) INTO v_have
  FROM public.product_stack_map psm
  JOIN public.products p ON p.id = psm.product_id AND p.status = 'launched'
  WHERE psm.stack_item_id = v_stack_id;

  IF v_have < v_min THEN
    INSERT INTO public.product_stack_map (stack_item_id, product_id)
    SELECT v_stack_id, p.id
    FROM public.products p
    WHERE p.status = 'launched'
      AND NOT EXISTS (
        SELECT 1 FROM public.product_stack_map x
        WHERE x.stack_item_id = v_stack_id AND x.product_id = p.id
      )
    ORDER BY random()
    LIMIT (v_min - v_have)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Sanity check
SELECT s.slug, COUNT(*) FILTER (WHERE p.status = 'launched') AS launched_products
FROM public.stack_items s
LEFT JOIN public.product_stack_map psm ON psm.stack_item_id = s.id
LEFT JOIN public.products p ON p.id = psm.product_id
WHERE s.slug = 'clonk'
GROUP BY s.slug;
