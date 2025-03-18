import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "../dashboard/Header";
import Sidebar from "../layout/Sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Sun, Palette, Type } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const themes = [
  { value: "black", label: "Black", bg: "bg-[#000000]" },
  { value: "blue", label: "Blue", bg: "bg-[#4287f5]" },
  { value: "red", label: "Red", bg: "bg-[#e11d48]" },
  { value: "green", label: "Green", bg: "bg-[#22c55e]" },
  { value: "yellow", label: "Yellow", bg: "bg-[#fbbf24]" },
];

const fonts = [
  { value: "ppneuemontreal", label: "PP Neue Montreal", className: "font-ppneuemontreal" },
  { value: "helvetica", label: "Helvetica", className: "font-helvetica" },
  { value: "inter", label: "Inter", className: "font-inter" },
];

const SettingsPage = () => {
  const { mode, color, font, toggleMode, setThemeColor, setFont } = useTheme();
  const currentRole = localStorage.getItem("userRole") as
    | "Admin"
    | "Manager"
    | "User";
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (currentRole !== "Admin") {
    return <div>Access denied</div>;
  }

  const toggleMobileSidebar = () => setIsMobileSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-background flex relative">
      <Sidebar 
        currentRole={currentRole}
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <Header 
        currentRole={currentRole} 
        toggleMobileSidebar={toggleMobileSidebar}
      />

      <main className="flex-1 md:ml-64 pt-16 px-4 container mx-auto max-w-7xl">
        <div className="py-6">
          <h2 className="text-2xl font-semibold mb-4">Settings</h2>
          
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Dark Mode Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Display Mode</CardTitle>
                {mode === "dark" ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Dark Mode</p>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={mode === "dark"}
                    onCheckedChange={toggleMode}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Color Theme Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Theme Colors</CardTitle>
                <Palette className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <RadioGroup
                  value={color}
                  onValueChange={setThemeColor}
                  className="grid grid-cols-3 gap-3"
                >
                  {themes.map((theme) => (
                    <div key={theme.value} className="relative">
                      <RadioGroupItem
                        value={theme.value}
                        id={theme.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={theme.value}
                        className="flex flex-col items-center justify-center rounded-md border-2 p-2 hover:border-primary peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                      >
                        <div
                          className={`w-6 h-6 rounded-full ${theme.bg} ring-1 ring-border peer-data-[state=checked]:ring-primary`}
                        />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    Selected: {themes.find(t => t.value === color)?.label}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Font Style Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Typography</CardTitle>
                <Type className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-2">
                <RadioGroup
                  value={font}
                  onValueChange={setFont}
                  className="space-y-2"
                >
                  {fonts.map((fontOption) => (
                    <div key={fontOption.value} className="relative">
                      <RadioGroupItem
                        value={fontOption.value}
                        id={fontOption.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={fontOption.value}
                        className="flex items-center justify-between rounded-md border-2 p-2 hover:border-primary peer-data-[state=checked]:border-primary cursor-pointer transition-all w-full"
                      >
                        <span className={`text-sm ${fontOption.className}`}>
                          {fontOption.label}
                        </span>
                        {(fontOption.value === "ppneuemontreal" || font === fontOption.value) && (
                          <span className="text-xs text-muted-foreground">
                            {fontOption.value === "ppneuemontreal" && "Default"}
                            {font === fontOption.value && "Current"}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-8 pb-4">
            Developed by felmardotdev
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
