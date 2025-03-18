import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeColor =
  | "black"
  | "blue"
  | "red"
  | "green"
  | "yellow"
  | "slate";
type ThemeMode = "light" | "dark";
type ThemeFont = "ppneuemontreal" | "helvetica" | "inter";

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  font: ThemeFont;
  toggleMode: () => void;
  setThemeColor: (color: ThemeColor) => void;
  setFont: (font: ThemeFont) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem("themeMode") as ThemeMode;
    return savedMode || "light";
  });

  const [color, setColor] = useState<ThemeColor>(() => {
    const savedColor = localStorage.getItem("themeColor") as ThemeColor;
    return savedColor || "black";
  });

  const [font, setFontState] = useState<ThemeFont>(() => {
    const savedFont = localStorage.getItem("themeFont") as ThemeFont;
    return savedFont || "ppneuemontreal";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(mode);
    localStorage.setItem("themeMode", mode);
    // Force a re-render of theme
    root.style.colorScheme = mode;
  }, [mode]);

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all theme classes first
    root.classList.remove(
      "theme-black",
      "theme-blue",
      "theme-red",
      "theme-green",
      "theme-yellow"
    );
    // Add new theme class
    root.classList.add(`theme-${color}`);
    localStorage.setItem("themeColor", color);
    // Force a re-render by toggling a class
    root.classList.remove("theme-init");
    setTimeout(() => root.classList.add("theme-init"), 0);
  }, [color]);

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove all font classes first
    root.classList.remove("font-ppneuemontreal", "font-helvetica", "font-inter");
    // Add new font class
    root.classList.add(`font-${font}`);
    localStorage.setItem("themeFont", font);
  }, [font]);

  const toggleMode = () => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setThemeColor = (newColor: ThemeColor) => {
    setColor(newColor);
  };

  const setFont = (newFont: ThemeFont) => {
    setFontState(newFont);
  };

  return (
    <ThemeContext.Provider value={{ mode, color, font, toggleMode, setThemeColor, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export { useTheme, ThemeProvider };
export default ThemeProvider;
