-- Create warehouses table
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for warehouses
CREATE POLICY "Authenticated users can view warehouses"
ON public.warehouses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create warehouses"
ON public.warehouses FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update warehouses"
ON public.warehouses FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete warehouses"
ON public.warehouses FOR DELETE TO authenticated
USING (true);

-- Add warehouse_id to items table (optional - for default warehouse assignment)
ALTER TABLE public.items 
ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- Add warehouse_id to batches table (for tracking stock per warehouse)
ALTER TABLE public.batches
ADD COLUMN warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON public.warehouses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default warehouse
INSERT INTO public.warehouses (name, address, is_default)
VALUES ('Main Warehouse', 'Default Location', true);