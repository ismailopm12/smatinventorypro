import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Check if this is the designated admin user
      if (user.email === 'mdismail.opm@gmail.com') {
        return 'admin';
      }
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user role:', error);
        return 'member';
      }
      
      return data?.role || 'member';
    },
    enabled: !!user?.id,
  });

  return {
    role: role || 'member',
    isAdmin: role === 'admin' || user?.email === 'mdismail.opm@gmail.com',
    isLoading,
  };
}
