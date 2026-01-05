-- Push products scheduled under old pricing logic to launch immediately
UPDATE products 
SET 
  launch_date = NOW(),
  status = 'launched'
WHERE id IN (
  'cf20986a-39d4-4ddd-8848-0ffc52a174de',  -- SideBuilt
  '140b23e4-ef2a-4f1b-a59d-cc10814b266c',  -- MarketingDB
  'bcd61c74-d413-4557-b3e6-7efef8027b89',  -- fyltr.co
  'bf6e4b8c-8cd8-4267-ae96-4b07acd67ddc',  -- SoloPass
  'dacbf192-c06a-4f22-9058-c90f5f79691a',  -- PolyTrak
  '1e82cc8d-f657-4a89-9f44-71b9b6bd22f2',  -- Zunno
  '59668cf5-8efe-4f44-b7eb-f48e13823128'   -- Size Chart Maker
);