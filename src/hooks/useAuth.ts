import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Supabase auth event:', event, currentSession?.user);
        
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          // Ensure we clear user data when signed out
          setUser(null);
          setSession(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    const fetchSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession) {
        console.log('Initial Supabase auth event: INITIAL_SESSION', initialSession.user);
      } else {
        console.log('No initial session found');
      }
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    };

    fetchSession();
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      console.log('Successfully signed out');
      // Explicitly clear user data after signOut
      setUser(null);
      setSession(null);
    }
  };

  return {
    user,
    session,
    isLoading,
    signOut,
  };
};
