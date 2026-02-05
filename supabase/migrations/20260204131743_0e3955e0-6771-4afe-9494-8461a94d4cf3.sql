-- Add email column to profiles table for password reset functionality
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);