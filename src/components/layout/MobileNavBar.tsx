import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Key,
  FolderClosed,
  Users,
  Database,
  Settings,
} from "lucide-react";
import { type Role } from "@/lib/utils/roles";

interface MobileNavBarProps {
  currentRole: Role;
}

const MobileNavBar = ({ currentRole }: MobileNavBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

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
      label: "Team",
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
      icon: Settings,
      label: "Settings",
      allowed: ["Admin"],
      path: "/settings",
    }
  ];

  if (!isMobile) return null;

  const allowedItems = menuItems.filter(item => item.allowed.includes(currentRole));
  const visibleItems = allowedItems.slice(0, 5); // Show max 5 items

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border md:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-14 px-2",
                isActive && "text-primary"
              )}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavBar;
