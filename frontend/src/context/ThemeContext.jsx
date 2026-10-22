import React, { createContext, useContext, useEffect, useState } from "react";
const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("omnirep_theme") || "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("omnirep_theme", theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
