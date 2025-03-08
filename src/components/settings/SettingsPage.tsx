import React from "react";
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
  { value: "orbitron", label: "Orbitron", className: "font-orbitron" },
  { value: "helvetica", label: "Helvetica", className: "font-helvetica" },
  { value: "arial", label: "Arial", className: "font-arial" },
];

const SettingsPage = () => {
  const { mode, color, font, toggleMode, setThemeColor, setFont } = useTheme();
  const currentRole = localStorage.getItem("userRole") as
    | "Admin"
    | "Manager"
    | "User";

  if (currentRole !== "Admin") {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentRole={currentRole} />
      <Header currentRole={currentRole} />

      <main className="flex-1 ml-64 pt-16 px-4 container mx-auto max-w-7xl">
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-semibold">Settings</h2>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div 
                className="flex items-center justify-between rounded-lg p-2 hover:bg-accent/50 transition-colors"
                role="group"
                aria-labelledby="dark-mode-label"
              >
                <div className="flex items-center space-x-4" id="dark-mode-label">
                  {mode === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={mode === "dark"}
                  onCheckedChange={toggleMode}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Palette className="w-5 h-5" />
                  <Label>Color Theme</Label>
                </div>
                <RadioGroup
                  value={color}
                  onValueChange={(value: any) => setThemeColor(value)}
                  className="grid grid-cols-5 gap-4"
                >
                  {themes.map((theme) => (
                    <div
                      key={theme.value}
                      className="flex flex-col items-center gap-2"
                    >
                      <RadioGroupItem
                        value={theme.value}
                        id={theme.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={theme.value}
                        className="flex flex-col items-center gap-2 rounded-md p-2 hover:bg-accent peer-data-[state=checked]:border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/50 cursor-pointer transition-all duration-200 relative"
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${theme.bg} ring-2 ring-border shadow-lg transition-transform hover:scale-110 peer-data-[state=checked]:ring-primary`}
                        />
                        <span className="text-sm">{theme.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Type className="w-5 h-5" />
                  <Label>Font Style</Label>
                </div>
                <RadioGroup
                  value={font}
                  onValueChange={(value: any) => setFont(value)}
                  className="grid grid-cols-3 gap-4"
                >
                  {fonts.map((fontOption) => (
                    <div
                      key={fontOption.value}
                      className="flex flex-col items-center gap-2"
                    >
                      <RadioGroupItem
                        value={fontOption.value}
                        id={fontOption.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={fontOption.value}
                        className="flex flex-col items-center gap-2 rounded-md p-2 hover:bg-accent peer-data-[state=checked]:border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-accent/50 cursor-pointer transition-all duration-200 relative w-full text-center"
                      >
                        <span className={`text-sm ${fontOption.className}`}>
                          {fontOption.label}
                          {fontOption.value === "orbitron" && " (Default)"}
                          {font === fontOption.value && " (Current)"}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
