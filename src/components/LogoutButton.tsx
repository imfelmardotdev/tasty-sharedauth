import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function LogoutButton() {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      navigate('/signin');
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
