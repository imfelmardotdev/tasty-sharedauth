import React from "react";
import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";
import { type Role } from "@/lib/utils/roles";

interface HeaderProps {
  currentRole?: Role;
}

const Header = ({ currentRole = "User" }: HeaderProps) => {
  return (
    <header className="w-full h-16 bg-background border-b border-border px-4 flex items-center justify-between fixed top-0 z-50">
      <div className="flex items-center gap-2">
        <Key className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Sharedauth Management</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" className="gap-2" disabled>
          <Key className="w-4 h-4" />
          {currentRole}
        </Button>
      </div>
    </header>
  );
};

export default Header;
