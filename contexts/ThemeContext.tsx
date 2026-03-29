import React, { createContext, useContext } from "react";
import { theme } from "@/styles/theme";
import { globalStyles } from "@/styles/global";

interface ThemeContextType {
  theme: typeof theme;
  styles: typeof globalStyles;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme, styles: globalStyles }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
