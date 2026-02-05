 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     console.log('Starting schema export...')
 
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     const supabase = createClient(supabaseUrl, supabaseServiceKey)
 
     const authHeader = req.headers.get('Authorization')
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'No authorization header' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const token = authHeader.replace('Bearer ', '')
     const { data: { user }, error: authError } = await supabase.auth.getUser(token)
     
     if (authError || !user) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     const { data: roleData } = await supabase
       .from('user_roles')
       .select('role')
       .eq('user_id', user.id)
       .maybeSingle()
 
     if (roleData?.role !== 'admin') {
       return new Response(
         JSON.stringify({ error: 'Admin access required' }),
         { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     let sql = `-- Warehouse Inventory Database Schema Export\n`
     sql += `-- Generated: ${new Date().toISOString()}\n`
     sql += `-- Complete SQL for migration\n\n`
 
     // ENUMS
     sql += `-- ============================================\n`
     sql += `-- ENUMS\n`
     sql += `-- ============================================\n\n`
     sql += `CREATE TYPE public.app_role AS ENUM ('admin', 'member');\n\n`
 
     // TABLES
     sql += `-- ============================================\n`
     sql += `-- TABLES\n`
     sql += `-- ============================================\n\n`
 
     sql += `-- Warehouses Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.warehouses (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  name TEXT NOT NULL,\n`
     sql += `  description TEXT,\n`
     sql += `  address TEXT,\n`
     sql += `  is_default BOOLEAN DEFAULT false,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- Categories Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.categories (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  name TEXT NOT NULL,\n`
     sql += `  color TEXT DEFAULT '#6366f1',\n`
     sql += `  icon TEXT DEFAULT 'Package',\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- Items Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.items (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  name TEXT NOT NULL,\n`
     sql += `  description TEXT,\n`
     sql += `  sku TEXT,\n`
     sql += `  barcode TEXT,\n`
     sql += `  category_id UUID REFERENCES public.categories(id),\n`
     sql += `  warehouse_id UUID REFERENCES public.warehouses(id),\n`
     sql += `  price NUMERIC DEFAULT 0,\n`
     sql += `  unit_of_measure TEXT DEFAULT 'pcs',\n`
     sql += `  min_stock_level INTEGER DEFAULT 0,\n`
     sql += `  max_stock_level INTEGER DEFAULT 1000,\n`
     sql += `  supplier_name TEXT,\n`
     sql += `  warehouse_location TEXT,\n`
     sql += `  image_url TEXT,\n`
     sql += `  created_by UUID,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- Batches Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.batches (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,\n`
     sql += `  warehouse_id UUID REFERENCES public.warehouses(id),\n`
     sql += `  batch_number TEXT NOT NULL,\n`
     sql += `  quantity NUMERIC NOT NULL DEFAULT 0,\n`
     sql += `  expiry_date DATE,\n`
     sql += `  notes TEXT,\n`
     sql += `  created_by UUID,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- Transactions Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.transactions (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,\n`
     sql += `  batch_id UUID REFERENCES public.batches(id),\n`
     sql += `  transaction_type TEXT NOT NULL,\n`
     sql += `  quantity NUMERIC NOT NULL,\n`
     sql += `  previous_quantity NUMERIC,\n`
     sql += `  new_quantity NUMERIC,\n`
     sql += `  notes TEXT,\n`
     sql += `  performed_by UUID,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- Profiles Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.profiles (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  user_id UUID NOT NULL UNIQUE,\n`
     sql += `  full_name TEXT,\n`
     sql += `  email TEXT,\n`
     sql += `  avatar_url TEXT,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     sql += `-- User Roles Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.user_roles (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  user_id UUID NOT NULL,\n`
     sql += `  role public.app_role NOT NULL DEFAULT 'member',\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  UNIQUE(user_id, role)\n`
     sql += `);\n\n`
 
     sql += `-- Alert Settings Table\n`
     sql += `CREATE TABLE IF NOT EXISTS public.alert_settings (\n`
     sql += `  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n`
     sql += `  user_id UUID NOT NULL,\n`
     sql += `  low_stock_enabled BOOLEAN DEFAULT true,\n`
     sql += `  low_stock_threshold INTEGER DEFAULT 10,\n`
     sql += `  expiry_enabled BOOLEAN DEFAULT true,\n`
     sql += `  expiry_warning_days INTEGER DEFAULT 30,\n`
     sql += `  stock_received_enabled BOOLEAN DEFAULT true,\n`
     sql += `  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n`
     sql += `  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n`
     sql += `);\n\n`
 
     // FUNCTIONS
     sql += `-- ============================================\n`
     sql += `-- FUNCTIONS\n`
     sql += `-- ============================================\n\n`
 
     sql += `CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n`
     sql += `RETURNS TRIGGER AS $$\n`
     sql += `BEGIN\n`
     sql += `  NEW.updated_at = now();\n`
     sql += `  RETURN NEW;\n`
     sql += `END;\n`
     sql += `$$ LANGUAGE plpgsql SET search_path = public;\n\n`
 
     sql += `CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)\n`
     sql += `RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$\n`
     sql += `  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)\n`
     sql += `$$;\n\n`
 
     sql += `CREATE OR REPLACE FUNCTION public.handle_new_user()\n`
     sql += `RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$\n`
     sql += `BEGIN\n`
     sql += `  INSERT INTO public.profiles (user_id, full_name, email) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);\n`
     sql += `  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');\n`
     sql += `  INSERT INTO public.alert_settings (user_id) VALUES (NEW.id);\n`
     sql += `  RETURN NEW;\n`
     sql += `END;\n`
     sql += `$$;\n\n`
 
     // TRIGGERS
     sql += `-- ============================================\n`
     sql += `-- TRIGGERS\n`
     sql += `-- ============================================\n\n`
 
     const tables = ['warehouses', 'categories', 'items', 'batches', 'profiles', 'alert_settings']
     for (const table of tables) {
       sql += `CREATE TRIGGER update_${table}_updated_at BEFORE UPDATE ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();\n`
     }
     sql += `\n-- Run in Supabase dashboard:\n`
     sql += `-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();\n\n`
 
     // RLS
     sql += `-- ============================================\n`
     sql += `-- ROW LEVEL SECURITY\n`
     sql += `-- ============================================\n\n`
 
     sql += `ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;\n`
     sql += `ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;\n\n`
 
     sql += `-- Warehouses Policies\n`
     sql += `CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can create warehouses" ON public.warehouses FOR INSERT WITH CHECK (true);\n`
     sql += `CREATE POLICY "Authenticated users can update warehouses" ON public.warehouses FOR UPDATE USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can delete warehouses" ON public.warehouses FOR DELETE USING (true);\n\n`
 
     sql += `-- Categories Policies\n`
     sql += `CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can create categories" ON public.categories FOR INSERT WITH CHECK (true);\n`
     sql += `CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE USING (true);\n\n`
 
     sql += `-- Items Policies\n`
     sql += `CREATE POLICY "Authenticated users can view items" ON public.items FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can create items" ON public.items FOR INSERT WITH CHECK (true);\n`
     sql += `CREATE POLICY "Authenticated users can update items" ON public.items FOR UPDATE USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can delete items" ON public.items FOR DELETE USING (true);\n\n`
 
     sql += `-- Batches Policies\n`
     sql += `CREATE POLICY "Authenticated users can view batches" ON public.batches FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can create batches" ON public.batches FOR INSERT WITH CHECK (true);\n`
     sql += `CREATE POLICY "Authenticated users can update batches" ON public.batches FOR UPDATE USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can delete batches" ON public.batches FOR DELETE USING (true);\n\n`
 
     sql += `-- Transactions Policies\n`
     sql += `CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Authenticated users can create transactions" ON public.transactions FOR INSERT WITH CHECK (true);\n`
     sql += `CREATE POLICY "Authenticated users can delete transactions" ON public.transactions FOR DELETE USING (true);\n\n`
 
     sql += `-- Profiles Policies\n`
     sql += `CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);\n`
     sql += `CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);\n`
     sql += `CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);\n\n`
 
     sql += `-- User Roles Policies\n`
     sql += `CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);\n`
     sql += `CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));\n\n`
 
     sql += `-- Alert Settings Policies\n`
     sql += `CREATE POLICY "Users can view own alert settings" ON public.alert_settings FOR SELECT USING (auth.uid() = user_id);\n`
     sql += `CREATE POLICY "Users can insert own alert settings" ON public.alert_settings FOR INSERT WITH CHECK (auth.uid() = user_id);\n`
     sql += `CREATE POLICY "Users can update own alert settings" ON public.alert_settings FOR UPDATE USING (auth.uid() = user_id);\n\n`
 
      // INDEXES
      sql += `-- ============================================\n`
      sql += `-- INDEXES (for better query performance)\n`
      sql += `-- ============================================\n\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_items_warehouse_id ON public.items(warehouse_id);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_items_barcode ON public.items(barcode);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_batches_item_id ON public.batches(item_id);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.batches(expiry_date);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON public.transactions(item_id);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);\n`
      sql += `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);\n\n`

      // STORAGE
      sql += `-- ============================================\n`
      sql += `-- STORAGE BUCKETS\n`
      sql += `-- ============================================\n\n`
      sql += `INSERT INTO storage.buckets (id, name, public) VALUES ('item-images', 'item-images', true);\n`
      sql += `CREATE POLICY "Public can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');\n`
      sql += `CREATE POLICY "Authenticated users can upload item images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images');\n`
      sql += `CREATE POLICY "Authenticated users can update item images" ON storage.objects FOR UPDATE USING (bucket_id = 'item-images');\n`
      sql += `CREATE POLICY "Authenticated users can delete item images" ON storage.objects FOR DELETE USING (bucket_id = 'item-images');\n\n`

      // MIGRATION NOTES
      sql += `-- ============================================\n`
      sql += `-- NOTES FOR MIGRATION\n`
      sql += `-- ============================================\n`
      sql += `-- 1. Create a new Supabase project\n`
      sql += `-- 2. Go to SQL Editor\n`
      sql += `-- 3. Paste this entire script and run\n`
      sql += `-- 4. Go to Authentication > Providers and enable Email\n`
      sql += `-- 5. Create the auth trigger manually:\n`
      sql += `--    CREATE TRIGGER on_auth_user_created\n`
      sql += `--      AFTER INSERT ON auth.users\n`
      sql += `--      FOR EACH ROW\n`
      sql += `--      EXECUTE FUNCTION public.handle_new_user();\n`
      sql += `-- 6. Update your app's SUPABASE_URL and SUPABASE_ANON_KEY\n`
      sql += `-- ============================================\n`
      sql += `-- END OF SCHEMA EXPORT\n`

      return new Response(
        JSON.stringify({ 
          success: true, 
          sql,
          tables: ['warehouses', 'categories', 'items', 'batches', 'transactions', 'profiles', 'user_roles', 'alert_settings'],
          functions: ['update_updated_at_column', 'has_role', 'handle_new_user'],
          triggers: 6,
          policies: 26,
          indexes: 11,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error: unknown) {
      console.error('Error exporting schema:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  })