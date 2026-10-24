import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("omnirep_theme") || "dark");

  useEffect(() => {
    // Isso aplica a classe 'dark' na tag <html> do site
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("omnirep_theme", theme);
  }, [theme]);

  // ✅ FIX: Garantindo que o nome exportado bata com o AppShell
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}