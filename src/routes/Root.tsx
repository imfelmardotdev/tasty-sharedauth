import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/LoadingScreen';

const Root = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to be loaded before deciding navigation
    if (!isLoading) {
      const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/forgot-password';
      
      if (!user && !isAuthRoute) {
        // Redirect to login if user is not authenticated and trying to access protected route
        navigate('/login');
      } else if (user && isAuthRoute) {
        // Redirect to dashboard if user is authenticated and trying to access auth routes
        navigate('/dashboard');
      }
      
      setIsReady(true);
    }
  }, [user, isLoading, navigate, location.pathname]);

  if (isLoading || !isReady) {
    return <LoadingScreen />;
  }

  return <Outlet />;
};

export default Root;
