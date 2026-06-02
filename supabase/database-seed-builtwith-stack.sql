-- Seed random launched products into the "Built With" platform stack_items
-- so each card shows a healthy product count. Idempotent and safe to re-run.
--
-- Target: bring each platform up to MIN_PER_PLATFORM mapped launched products
-- by randomly attaching products that aren't already mapped to that platform.

DO $$
DECLARE
  v_slug      TEXT;
  v_stack_id  INT;
  v_have      INT;
  v_need      INT;
  v_min       INT := 25;                -- minimum products per platform card
  v_slugs     TEXT[] := ARRAY[
                'lovable','cursor','bolt','replit','claude-code',
                'codex','google-ai-studio','base44','v0'
              ];
BEGIN
  FOREACH v_slug IN ARRAY v_slugs LOOP
    SELECT id INTO v_stack_id FROM public.stack_items WHERE slug = v_slug LIMIT 1;
    IF v_stack_id IS NULL THEN
      -- Create the stack_item if missing so the card always resolves
      INSERT INTO public.stack_items (slug, name)
      VALUES (v_slug, INITCAP(REPLACE(v_slug, '-', ' ')))
      RETURNING id INTO v_stack_id;
    END IF;

    SELECT COUNT(*) INTO v_have
    FROM public.product_stack_map psm
    JOIN public.products p ON p.id = psm.product_id AND p.status = 'launched'
    WHERE psm.stack_item_id = v_stack_id;

    v_need := GREATEST(v_min - v_have, 0);

    IF v_need > 0 THEN
      INSERT INTO public.product_stack_map (stack_item_id, product_id)
      SELECT v_stack_id, p.id
      FROM public.products p
      WHERE p.status = 'launched'
        AND NOT EXISTS (
          SELECT 1 FROM public.product_stack_map x
          WHERE x.stack_item_id = v_stack_id AND x.product_id = p.id
        )
      ORDER BY random()
      LIMIT v_need
      ON CONFLICT DO NOTHING;
    END IF;

    RAISE NOTICE 'Built With %: had %, added up to % (target %)',
      v_slug, v_have, v_need, v_min;
  END LOOP;
END $$;

-- Sanity check
SELECT s.slug,
       COUNT(*) FILTER (WHERE p.status = 'launched') AS launched_products
FROM public.stack_items s
LEFT JOIN public.product_stack_map psm ON psm.stack_item_id = s.id
LEFT JOIN public.products p ON p.id = psm.product_id
WHERE s.slug IN ('lovable','cursor','bolt','replit','claude-code',
                 'codex','google-ai-studio','base44','v0')
GROUP BY s.slug
ORDER BY s.slug;
