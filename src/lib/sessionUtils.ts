import { supabase } from './supabase';

export async function checkAuthStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    isAuthenticated: !!session && !!user,
    session,
    user
  };
}

export async function clearAllAuthData() {
  // Sign out from Supabase
  await supabase.auth.signOut();
  
  // Clear localStorage items related to auth
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear sessionStorage items related to auth
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      sessionStorage.removeItem(key);
    }
  });
}
