import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { WelcomePopup } from '@/components/WelcomePopup';
import { Warehouse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading, justLoggedIn, clearJustLoggedIn } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (justLoggedIn && user) {
      // Fetch user profile name
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        const name = data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        setUserName(name);
        setShowWelcome(true);
      };
      fetchProfile();
    }
  }, [justLoggedIn, user]);

  const handleWelcomeClose = (open: boolean) => {
    if (!open) {
      setShowWelcome(false);
      clearJustLoggedIn();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Warehouse className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <MainLayout />
      <WelcomePopup
        userName={userName}
        open={showWelcome}
        onOpenChange={handleWelcomeClose}
      />
    </>
  );
};

export default Index;