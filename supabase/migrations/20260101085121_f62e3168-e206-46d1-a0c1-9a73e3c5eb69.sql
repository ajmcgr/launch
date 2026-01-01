-- Remove the Media placeholder sponsored product
DELETE FROM sponsored_products WHERE id = '9757a40a-b789-4731-bddf-1305dd3d3d7e';

-- Move Bio to position 1
UPDATE sponsored_products SET position = 1 WHERE id = '7bf770d5-5073-4cbb-b5d4-2b59ac6dc640';