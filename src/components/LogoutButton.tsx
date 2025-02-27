'use client'

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClientComponentClient();
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // First, sign out on the client side
      await supabase.auth.signOut();
      
      // Then call the server-side logout endpoint
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Force a hard reload to clear any client-side state
        window.location.href = '/login';
      } else {
        console.error('Logout failed with status:', response.status);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoggingOut}
      className={`${isLoggingOut ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} text-white px-4 py-2 rounded transition-colors`}
    >
      {isLoggingOut ? 'Logging out...' : 'Logout'}
    </button>
  );
}
