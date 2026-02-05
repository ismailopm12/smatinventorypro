 -- ============================================
 -- Warehouse Inventory Database Schema
 -- Complete SQL export for migration
 -- ============================================
 
 -- ============================================
 -- ENUMS
 -- ============================================
 
 CREATE TYPE public.app_role AS ENUM ('admin', 'member');
 
 -- ============================================
 -- TABLES
 -- ============================================
 
 -- Warehouses Table
 CREATE TABLE IF NOT EXISTS public.warehouses (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   name TEXT NOT NULL,
   description TEXT,
   address TEXT,
   is_default BOOLEAN DEFAULT false,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- Categories Table
 CREATE TABLE IF NOT EXISTS public.categories (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   name TEXT NOT NULL,
   color TEXT DEFAULT '#6366f1',
   icon TEXT DEFAULT 'Package',
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- Items Table
 CREATE TABLE IF NOT EXISTS public.items (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   name TEXT NOT NULL,
   description TEXT,
   sku TEXT,
   barcode TEXT,
   category_id UUID REFERENCES public.categories(id),
   warehouse_id UUID REFERENCES public.warehouses(id),
   price NUMERIC DEFAULT 0,
   unit_of_measure TEXT DEFAULT 'pcs',
   min_stock_level INTEGER DEFAULT 0,
   max_stock_level INTEGER DEFAULT 1000,
   supplier_name TEXT,
   warehouse_location TEXT,
   image_url TEXT,
   created_by UUID,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- Batches Table
 CREATE TABLE IF NOT EXISTS public.batches (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
   warehouse_id UUID REFERENCES public.warehouses(id),
   batch_number TEXT NOT NULL,
   quantity NUMERIC NOT NULL DEFAULT 0,
   expiry_date DATE,
   notes TEXT,
   created_by UUID,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- Transactions Table
 CREATE TABLE IF NOT EXISTS public.transactions (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
   batch_id UUID REFERENCES public.batches(id),
   transaction_type TEXT NOT NULL,
   quantity NUMERIC NOT NULL,
   previous_quantity NUMERIC,
   new_quantity NUMERIC,
   notes TEXT,
   performed_by UUID,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- Profiles Table
 CREATE TABLE IF NOT EXISTS public.profiles (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL UNIQUE,
   full_name TEXT,
   email TEXT,
   avatar_url TEXT,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- User Roles Table
 CREATE TABLE IF NOT EXISTS public.user_roles (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   role public.app_role NOT NULL DEFAULT 'member',
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   UNIQUE(user_id, role)
 );
 
 -- Alert Settings Table
 CREATE TABLE IF NOT EXISTS public.alert_settings (
   id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID NOT NULL,
   low_stock_enabled BOOLEAN DEFAULT true,
   low_stock_threshold INTEGER DEFAULT 10,
   expiry_enabled BOOLEAN DEFAULT true,
   expiry_warning_days INTEGER DEFAULT 30,
   stock_received_enabled BOOLEAN DEFAULT true,
   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
 );
 
 -- ============================================
 -- FUNCTIONS
 -- ============================================
 
 -- Update timestamp function
 CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS TRIGGER AS $$
 BEGIN
   NEW.updated_at = now();
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SET search_path = public;
 
 -- Has role function (for RLS)
 CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
 RETURNS BOOLEAN
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path = public
 AS $$
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
   )
 $$;
 
 -- Handle new user function
 CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS TRIGGER
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
 AS $$
 BEGIN
   INSERT INTO public.profiles (user_id, full_name, email)
   VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
   
   INSERT INTO public.user_roles (user_id, role)
   VALUES (NEW.id, 'member');
   
   INSERT INTO public.alert_settings (user_id)
   VALUES (NEW.id);
   
   RETURN NEW;
 END;
 $$;
 
 -- ============================================
 -- TRIGGERS
 -- ============================================
 
 CREATE TRIGGER update_warehouses_updated_at
   BEFORE UPDATE ON public.warehouses
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_categories_updated_at
   BEFORE UPDATE ON public.categories
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_items_updated_at
   BEFORE UPDATE ON public.items
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_batches_updated_at
   BEFORE UPDATE ON public.batches
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_profiles_updated_at
   BEFORE UPDATE ON public.profiles
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 CREATE TRIGGER update_alert_settings_updated_at
   BEFORE UPDATE ON public.alert_settings
   FOR EACH ROW
   EXECUTE FUNCTION public.update_updated_at_column();
 
 -- Trigger for new user signup (run this in Supabase dashboard)
 -- CREATE TRIGGER on_auth_user_created
 --   AFTER INSERT ON auth.users
 --   FOR EACH ROW
 --   EXECUTE FUNCTION public.handle_new_user();
 
 -- ============================================
 -- ROW LEVEL SECURITY
 -- ============================================
 
 -- Enable RLS
 ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;
 
 -- Warehouses Policies (all authenticated users)
 CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT USING (true);
 CREATE POLICY "Authenticated users can create warehouses" ON public.warehouses FOR INSERT WITH CHECK (true);
 CREATE POLICY "Authenticated users can update warehouses" ON public.warehouses FOR UPDATE USING (true);
 CREATE POLICY "Authenticated users can delete warehouses" ON public.warehouses FOR DELETE USING (true);
 
 -- Categories Policies (all authenticated users)
 CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT USING (true);
 CREATE POLICY "Authenticated users can create categories" ON public.categories FOR INSERT WITH CHECK (true);
 CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE USING (true);
 CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE USING (true);
 
 -- Items Policies (all authenticated users)
 CREATE POLICY "Authenticated users can view items" ON public.items FOR SELECT USING (true);
 CREATE POLICY "Authenticated users can create items" ON public.items FOR INSERT WITH CHECK (true);
 CREATE POLICY "Authenticated users can update items" ON public.items FOR UPDATE USING (true);
 CREATE POLICY "Authenticated users can delete items" ON public.items FOR DELETE USING (true);
 
 -- Batches Policies (all authenticated users)
 CREATE POLICY "Authenticated users can view batches" ON public.batches FOR SELECT USING (true);
 CREATE POLICY "Authenticated users can create batches" ON public.batches FOR INSERT WITH CHECK (true);
 CREATE POLICY "Authenticated users can update batches" ON public.batches FOR UPDATE USING (true);
 CREATE POLICY "Authenticated users can delete batches" ON public.batches FOR DELETE USING (true);
 
 -- Transactions Policies (all authenticated users, no update)
 CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT USING (true);
 CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (true);
 CREATE POLICY "Authenticated users can delete transactions" ON public.transactions FOR DELETE USING (true);
 
 -- Profiles Policies
 CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
 CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
 
 -- User Roles Policies
 CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));
 
 -- Alert Settings Policies
 CREATE POLICY "Users can view own alert settings" ON public.alert_settings FOR SELECT USING (auth.uid() = user_id);
 CREATE POLICY "Users can insert own alert settings" ON public.alert_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
 CREATE POLICY "Users can update own alert settings" ON public.alert_settings FOR UPDATE USING (auth.uid() = user_id);
 
-- ============================================
-- INDEXES (for better query performance)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_warehouse_id ON public.items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.items(barcode);
CREATE INDEX IF NOT EXISTS idx_batches_item_id ON public.batches(item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON public.transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create item-images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);

-- Storage Policies
CREATE POLICY "Public can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Authenticated users can upload item images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');
CREATE POLICY "Authenticated users can update item images" ON storage.objects FOR UPDATE USING (bucket_id = 'item-images');
CREATE POLICY "Authenticated users can delete item images" ON storage.objects FOR DELETE USING (bucket_id = 'item-images');

-- ============================================
-- DEFAULT DATA (optional - uncomment to seed)
-- ============================================

-- Insert default warehouse
-- INSERT INTO public.warehouses (name, description, is_default) VALUES ('Main Warehouse', 'Primary storage location', true);

-- ============================================
-- NOTES FOR MIGRATION
-- ============================================
-- 1. Create a new Supabase project
-- 2. Go to SQL Editor
-- 3. Paste this entire script and run
-- 4. Go to Authentication > Providers and enable Email
-- 5. Create the auth trigger manually:
--    CREATE TRIGGER on_auth_user_created
--      AFTER INSERT ON auth.users
--      FOR EACH ROW
--      EXECUTE FUNCTION public.handle_new_user();
-- 6. Update your app's SUPABASE_URL and SUPABASE_ANON_KEY
-- ============================================
-- END OF SCHEMA
-- ============================================