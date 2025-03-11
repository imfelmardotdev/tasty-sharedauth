import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import MobileNavBar from "@/components/layout/MobileNavBar";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  const userRole = localStorage.getItem("userRole") as "Admin" | "Manager" | "User";
  
  return (
    <>
      {children}
      <MobileNavBar currentRole={userRole} />
    </>
  );
};

export default AuthGuard;
