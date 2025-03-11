import React from "react";
import { cn } from "@/lib/utils";

interface FloatingActionBarProps {
  children: React.ReactNode;
  className?: string;
}

const FloatingActionBar = ({ children, className }: FloatingActionBarProps) => {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 md:left-64 z-40",
        "bg-background/80 backdrop-blur-lg",
        "border-t border-border",
        "py-3 px-4",
        "transition-transform duration-200 ease-in-out",
        "mb-16 md:mb-4", // Space for navigation bar, less on desktop
        className
      )}
    >
      <div className="flex items-center justify-around gap-2">
        {children}
      </div>
    </div>
  );
};

export default FloatingActionBar;
