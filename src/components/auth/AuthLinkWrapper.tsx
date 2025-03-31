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
    // Get both hash and search parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    
    // Combine parameters from both sources
    const combinedParams = new URLSearchParams();
    
    // Add search parameters first
    searchParams.forEach((value, key) => {
      combinedParams.set(key, value);
    });
    
    // Add hash parameters, overwriting search params if same key exists
    hashParams.forEach((value, key) => {
      combinedParams.set(key, value);
    });

    // Log the auth link state
    console.log('Auth link state:', {
      hasHashParams: window.location.hash.length > 0,
      hasSearchParams: window.location.search.length > 0,
      error: combinedParams.get('error'),
      errorDescription: combinedParams.get('error_description'),
      hash: window.location.hash,
      search: window.location.search,
      type: combinedParams.get('type'),
      code: combinedParams.get('code')
    });

    // Always redirect to callback with combined parameters
    navigate({
      pathname: '/auth/callback',
      search: combinedParams.toString()
    }, { replace: true });
  }, [location, navigate]);

  return null; // This component doesn't render anything
};

export default AuthLinkWrapper;
