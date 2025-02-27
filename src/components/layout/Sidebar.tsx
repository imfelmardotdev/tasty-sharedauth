import React from "react";
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
}

const Sidebar = ({ className, currentRole }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    {
      icon: Key,
      label: "Sharedauth Codes",
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
    <div
      className={cn(
        "w-64 h-screen bg-background border-r border-border fixed left-0 top-0 pt-16",
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
              onClick={() => item.path && navigate(item.path)}
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
  );
};

export default Sidebar;
