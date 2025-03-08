import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Key,
  Users,
  Settings,
  LogOut,
  Database,
  Share2,
  FolderClosed,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { type Role } from "@/lib/utils/roles";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  className?: string;
  currentRole: Role;
  isMobileSidebarOpen?: boolean;
  toggleMobileSidebar?: () => void;
}

const Sidebar = ({ 
  className, 
  currentRole, 
  isMobileSidebarOpen = false, 
  toggleMobileSidebar 
}: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
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

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    {
      icon: Key,
      label: "Dashboard",
      allowed: ["Admin", "Manager", "User"],
      path: "/dashboard",
    },
    {
      icon: FolderClosed,
      label: "Groups",
      allowed: ["Admin", "Manager", "User"],
      path: "/groups",
    },
    {
      icon: Users,
      label: "Team Access",
      allowed: ["Admin", "Manager"],
      path: "/team",
    },
    {
      icon: Database,
      label: "Extension",
      allowed: ["Admin", "Manager"],
      path: "/models",
    },
    {
      icon: Share2,
      label: "Shared Links",
      allowed: ["Admin"],
      path: "/shared-links",
    },
    {
      icon: Settings,
      label: "Settings",
      allowed: ["Admin"],
      path: "/settings",
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "w-64 h-screen bg-background border-r border-border fixed left-0 top-0 pt-16 z-50",
          "transition-transform duration-300 ease-in-out",
          isMobile && !isMobileSidebarOpen && "-translate-x-full",
          isMobile && "shadow-xl",
          !isMobile && "translate-x-0",
          className,
        )}
      >
        <div className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isAllowed = item.allowed.includes(currentRole);
            const isActive = location.pathname === item.path;
            return isAllowed ? (
              <Button
                key={item.path}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-primary text-primary-foreground",
                )}
                onClick={() => {
                  if (item.path) {
                    navigate(item.path);
                    if (isMobile && toggleMobileSidebar) {
                      toggleMobileSidebar();
                    }
                  }
                }}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ) : null;
          })}
        </div>

        <div className="absolute bottom-4 w-full px-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-500 hover:text-red-600 dark:hover:bg-red-950/50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
          <div className="mt-2 text-sm text-center text-muted-foreground">
            {localStorage.getItem("userEmail")}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
