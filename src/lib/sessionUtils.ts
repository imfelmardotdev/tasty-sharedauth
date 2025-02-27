import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function checkAuthStatus() {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();
  
  return {
    isAuthenticated: !!session && !!user,
    session,
    user
  };
}

export async function clearAllAuthData() {
  const supabase = createClientComponentClient();
  
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
