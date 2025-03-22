import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * AuthLinkWrapper - Wraps auth callback pages and handles URL manipulation
 * for compatibility with Supabase's PKCE flow.
 */
export const AuthLinkWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.hash.substring(1));
    const hasHashParams = window.location.hash.length > 0;
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Log the auth link state
    console.log('Auth link state:', {
      hasHashParams,
      error,
      errorDescription,
      hash: window.location.hash,
      search: window.location.search
    });

    if (hasHashParams) {
      // Convert hash parameters to search parameters for Supabase
      const searchParams = new URLSearchParams(location.search);
      params.forEach((value, key) => {
        searchParams.set(key, value);
      });

      // Navigate to the callback page with search parameters
      navigate({
        pathname: '/auth/callback',
        search: searchParams.toString()
      }, { replace: true });
    }
  }, [location, navigate]);

  return null; // This component doesn't render anything
};

export default AuthLinkWrapper;
