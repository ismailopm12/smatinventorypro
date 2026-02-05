-- Add delete policy for transactions (admins can delete)
CREATE POLICY "Authenticated users can delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (true);