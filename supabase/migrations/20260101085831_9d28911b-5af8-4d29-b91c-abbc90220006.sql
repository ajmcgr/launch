-- Fix current positions: Write should be 1, Bio should be 2, Media should be 3
UPDATE sponsored_products SET position = 3 WHERE product_id = '5171ff1a-93ba-4b0a-a065-8090b077f80d'; -- Media
UPDATE sponsored_products SET position = 2 WHERE product_id = 'f33ba26c-bc63-4acd-9254-0a6ffd738f80'; -- Bio  
UPDATE sponsored_products SET position = 1 WHERE product_id = 'b51b4d05-afe4-4a31-9afb-f80fe7b32a03'; -- Write