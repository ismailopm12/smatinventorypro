-- Change quantity columns from integer to numeric to support decimal values (e.g., 1.5 kg)

-- Update batches table
ALTER TABLE public.batches 
ALTER COLUMN quantity TYPE numeric(10,3) USING quantity::numeric(10,3);

-- Update transactions table
ALTER TABLE public.transactions 
ALTER COLUMN quantity TYPE numeric(10,3) USING quantity::numeric(10,3);

ALTER TABLE public.transactions 
ALTER COLUMN previous_quantity TYPE numeric(10,3) USING previous_quantity::numeric(10,3);

ALTER TABLE public.transactions 
ALTER COLUMN new_quantity TYPE numeric(10,3) USING new_quantity::numeric(10,3);