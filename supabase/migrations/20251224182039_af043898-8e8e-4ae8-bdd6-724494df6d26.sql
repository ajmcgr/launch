-- Update the Media product with the 3 Stripe product IDs from the dashboard filter
UPDATE products 
SET stripe_product_id = 'prod_Ri3wlI3A9ohBum,prod_Ri3uJYjnVtw2Xn,prod_Ri3vFeU6ACpSbg'
WHERE id = '5171ff1a-93ba-4b0a-a065-8090b077f80d';