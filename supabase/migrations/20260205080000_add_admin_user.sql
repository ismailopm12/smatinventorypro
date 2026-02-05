-- ============================================
-- Add Admin User for mdismail.opm@gmail.com
-- ============================================

-- First, ensure the user exists in auth.users (this would be done via signup)
-- Then assign admin role to the user

-- If user already exists, update their role to admin
-- If user doesn't exist yet, they'll get admin role on first login via the signup process

-- Add admin role for existing user with email mdismail.opm@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'mdismail.opm@gmail.com'
ON CONFLICT (user_id, role) 
DO UPDATE SET role = 'admin';

-- Alternative approach: Create a function to make any user admin
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user role to admin
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'
  FROM auth.users 
  WHERE email = user_email
  ON CONFLICT (user_id, role) 
  DO UPDATE SET role = 'admin';
  
  RAISE NOTICE 'User % has been granted admin role', user_email;
END;
$$;

-- Grant execute permission on the function to authenticated users
-- (Only admins should be able to make others admin in production)
GRANT EXECUTE ON FUNCTION public.make_user_admin(TEXT) TO authenticated;

-- Usage example:
-- SELECT public.make_user_admin('mdismail.opm@gmail.com');