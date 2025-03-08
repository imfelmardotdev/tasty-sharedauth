import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Key, Menu } from "lucide-react";
import { type Role } from "@/lib/utils/roles";

interface HeaderProps {
  currentRole?: Role;
  toggleMobileSidebar?: () => void;
}

const Header = ({ currentRole = "User", toggleMobileSidebar }: HeaderProps) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is the md breakpoint in Tailwind
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  return (
    <header className="w-full h-16 bg-background border-b border-border px-4 flex items-center justify-between fixed top-0 z-50">
      <div className="flex items-center gap-2">
        {isMobile && toggleMobileSidebar && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-2" 
            onClick={toggleMobileSidebar}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Key className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold hidden sm:inline">Sharedauth Management</h1>
        <h1 className="text-xl font-semibold sm:hidden">Sharedauth</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" className="gap-2" disabled>
          <Key className="w-4 h-4" />
          <span className="hidden sm:inline">{currentRole}</span>
          <span className="sm:hidden">{currentRole.charAt(0)}</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
