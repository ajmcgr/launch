-- Allow admins to view all orders for the Promotion tab
CREATE POLICY "Admins can view all orders"
ON orders
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));