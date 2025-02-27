import { useEffect } from 'react';
import Home from '@/components/home';
import { supabase } from '@/lib/supabase';

export default function Index() {
  // Clear any potentially invalid auth data on initial page load
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Remove any stored auth data if no valid session exists
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
      }
    };
    
    checkAuth();
  }, []);

  return <Home />;
}
