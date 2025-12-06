-- Update AdGenerator product icon to the new uploaded image
UPDATE product_media 
SET url = '/images/adgenerator-icon.jpeg'
WHERE product_id = 'de1af16e-71f4-40f7-83a5-b30b65fa276c' 
AND type = 'icon';